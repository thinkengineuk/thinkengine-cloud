import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';
import { parse } from 'npm:csv-parse@5.5.3/sync';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        let { csvContent, csvUrl, boardId: targetBoardId } = body;

        // If URL provided, fetch the CSV
        if (!csvContent && csvUrl) {
            const resp = await fetch(csvUrl);
            csvContent = await resp.text();
        }

        if (!csvContent) {
            return Response.json({ error: 'No CSV content provided' }, { status: 400 });
        }

        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`Processing ${records.length} records...`);

        // Fetch all users for matching
        const allUsers = await base44.asServiceRole.entities.User.list();
        const usersByName = {};
        allUsers.forEach(u => {
            usersByName[u.full_name.toLowerCase()] = u;
        });

        // Get board
        const boards = await base44.asServiceRole.entities.Board.filter({ id: targetBoardId });
        const board = boards[0];

        if (!board) {
            return Response.json({ error: 'Board not found' }, { status: 404 });
        }

        // Get existing columns
        const existingColumns = await base44.asServiceRole.entities.Column.filter({ board_id: board.id });
        const columnsByName = {};
        existingColumns.forEach(col => {
            columnsByName[col.name.toLowerCase()] = col;
        });

        const stats = { tasksCreated: 0, commentsCreated: 0, checklistsCreated: 0, errors: [] };

        // Step 1: Create unique columns in bulk (sequentially but only new ones)
        const uniqueSections = [...new Set(records.map(r => r.section || 'Imported'))];
        for (let i = 0; i < uniqueSections.length; i++) {
            const sectionName = uniqueSections[i];
            if (!columnsByName[sectionName.toLowerCase()]) {
                const newColumn = await base44.asServiceRole.entities.Column.create({
                    board_id: board.id,
                    name: sectionName,
                    position: Object.keys(columnsByName).length + i,
                    color: 'blue',
                });
                columnsByName[sectionName.toLowerCase()] = newColumn;
                await delay(200);
            }
        }

        // Step 2: Build task objects
        const validRecords = [];
        const taskObjects = [];
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const sectionName = record.section || 'Imported';
            const column = columnsByName[sectionName.toLowerCase()];
            if (!column || !record.name || !record.name.trim()) continue;

            const assigneeUser = record.assignee ? usersByName[record.assignee.toLowerCase()] : null;
            const tags = record.tags ? record.tags.split(';').map(t => t.trim()).filter(t => t) : [];
            const status = record.status === '2' ? 'completed' : 'active';
            let priority = 'medium';
            if (tags.some(t => t.toUpperCase() === 'HIGH')) priority = 'high';
            else if (tags.some(t => t.toUpperCase() === 'LOW')) priority = 'low';
            let dueDate = null;
            if (record.due_date) {
                const parsed = new Date(record.due_date);
                if (!isNaN(parsed.getTime())) dueDate = parsed.toISOString().split('T')[0];
            }

            validRecords.push(record);
            taskObjects.push({
                board_id: board.id,
                column_id: column.id,
                title: record.name.trim(),
                description: record.notes || '',
                assigned_to: assigneeUser ? assigneeUser.email : null,
                due_date: dueDate,
                tags,
                priority,
                status,
                position: i,
            });
        }

        // Step 3: Bulk create tasks in batches of 20
        const createdTasks = [];
        const batchSize = 20;
        for (let i = 0; i < taskObjects.length; i += batchSize) {
            const batch = taskObjects.slice(i, i + batchSize);
            const created = await base44.asServiceRole.entities.Task.bulkCreate(batch);
            createdTasks.push(...created);
            stats.tasksCreated += created.length;
            await delay(500);
        }

        // Step 4: Parse comments and checklists, build bulk arrays
        const allComments = [];
        const allChecklists = [];
        const allChecklistItems = []; // will be filled after checklists are created
        const checklistItemsByChecklistIndex = [];

        for (let i = 0; i < createdTasks.length; i++) {
            const task = createdTasks[i];
            const record = validRecords[i];

            // Parse comments
            if (record.comments) {
                const commentRegex = /([A-Za-z][^(;]+)\s*\(([^)]+)\):\s*((?:(?!;\s*[A-Za-z][^(;]+\s*\([^)]+\):)[\s\S])*)/g;
                let match;
                while ((match = commentRegex.exec(record.comments)) !== null) {
                    const authorName = match[1].trim();
                    const cleanText = match[3].replace(/<person_id>[^<]*<\/person_id>\s*/g, '').trim();
                    if (cleanText) {
                        allComments.push({ task_id: task.id, text: `${authorName}: ${cleanText}` });
                    }
                }
            }

            // Parse checklists
            if (record.checklists) {
                const blocks = record.checklists.split(/(?=Checklist\s*\d*\s*:)/i).filter(b => b.trim());
                for (let ci = 0; ci < blocks.length; ci++) {
                    const block = blocks[ci];
                    const colonIdx = block.indexOf(':');
                    const title = colonIdx > 0 ? block.substring(0, colonIdx).trim() : 'Checklist';
                    const itemsText = colonIdx > 0 ? block.substring(colonIdx + 1) : block;
                    const rawItems = itemsText.split(/\[\s*[x ]?\s*\]/).map(s => s.trim()).filter(s => s && s.length > 1);
                    if (rawItems.length > 0) {
                        checklistItemsByChecklistIndex.push({ items: rawItems });
                        allChecklists.push({ task_id: task.id, title, position: ci });
                    }
                }
            }
        }

        // Step 5: Bulk create comments in batches
        for (let i = 0; i < allComments.length; i += batchSize) {
            const batch = allComments.slice(i, i + batchSize);
            await base44.asServiceRole.entities.Comment.bulkCreate(batch);
            stats.commentsCreated += batch.length;
            await delay(500);
        }

        // Step 6: Bulk create checklists then their items
        for (let i = 0; i < allChecklists.length; i += batchSize) {
            const batch = allChecklists.slice(i, i + batchSize);
            const created = await base44.asServiceRole.entities.Checklist.bulkCreate(batch);
            stats.checklistsCreated += created.length;
            // Create items for this batch
            const itemsBatch = [];
            for (let j = 0; j < created.length; j++) {
                const { items } = checklistItemsByChecklistIndex[i + j];
                items.forEach((text, idx) => itemsBatch.push({ checklist_id: created[j].id, text, completed: false, position: idx }));
            }
            if (itemsBatch.length > 0) {
                await base44.asServiceRole.entities.ChecklistItem.bulkCreate(itemsBatch);
            }
            await delay(500);
        }

        console.log('Import completed:', stats);

        return Response.json({
            success: true,
            message: `Import completed: ${stats.tasksCreated} tasks, ${stats.commentsCreated} comments, ${stats.checklistsCreated} checklists created`,
            stats: {
                tasksCreated: stats.tasksCreated,
                commentsCreated: stats.commentsCreated,
                checklistsCreated: stats.checklistsCreated,
                errors: stats.errors.slice(0, 10),
            },
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});