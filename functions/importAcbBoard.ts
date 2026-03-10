import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { parse } from 'npm:csv-parse@5.5.3/sync';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        console.log("Attempting to authenticate user...");
        const user = await base44.auth.me();
        console.log("User object:", user);

        if (!user) {
            console.log("User not authenticated or not authorized.");
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const targetBoardId = formData.get('boardId');

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        const csvContent = await file.text();
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

        const stats = {
            tasksCreated: 0,
            commentsCreated: 0,
            checklistsCreated: 0,
            errors: [],
        };

        // Create unique columns
        const uniqueSections = new Set();
        records.forEach(record => {
            const sectionName = record.section || 'Imported';
            uniqueSections.add(sectionName);
        });

        for (const sectionName of uniqueSections) {
            if (!columnsByName[sectionName.toLowerCase()]) {
                try {
                    const newColumn = await base44.asServiceRole.entities.Column.create({
                        board_id: board.id,
                        name: sectionName,
                        position: Object.keys(columnsByName).length,
                        color: 'blue',
                    });
                    columnsByName[sectionName.toLowerCase()] = newColumn;
                } catch (error) {
                    stats.errors.push(`Column creation failed: ${error.message}`);
                }
            }
        }

        // Process tasks one by one to handle comments and checklists
        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            try {
                const sectionName = record.section || 'Imported';
                const column = columnsByName[sectionName.toLowerCase()];
                
                if (!column) {
                    stats.errors.push(`No column for "${sectionName}" - skipped "${record.name}"`);
                    continue;
                }

                // Match assignee
                let assignedTo = null;
                if (record.assignee) {
                    const assigneeUser = usersByName[record.assignee.toLowerCase()];
                    if (assigneeUser) {
                        assignedTo = assigneeUser.email;
                    }
                }

                // Parse tags
                const tags = record.tags ? record.tags.split(';').map(t => t.trim()).filter(t => t) : [];

                // Parse status
                const status = record.status === '2' ? 'completed' : 'active';

                // Parse priority
                let priority = 'medium';
                if (tags.some(t => t.toUpperCase() === 'HIGH')) {
                    priority = 'high';
                } else if (tags.some(t => t.toUpperCase() === 'LOW')) {
                    priority = 'low';
                }

                // Parse due date
                let dueDate = null;
                if (record.due_date) {
                    try {
                        const parsed = new Date(record.due_date);
                        if (!isNaN(parsed.getTime())) {
                            dueDate = parsed.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        // Skip invalid dates
                    }
                }

                // Create task
                const createdTask = await base44.asServiceRole.entities.Task.create({
                    board_id: board.id,
                    column_id: column.id,
                    title: record.name || 'Untitled Task',
                    description: record.notes || '',
                    assigned_to: assignedTo,
                    due_date: dueDate,
                    tags: tags,
                    priority: priority,
                    status: status,
                    position: i,
                });
                stats.tasksCreated++;

                // Parse and create comments
                if (record.comments) {
                    try {
                        // Comments format: "Author Name: Comment text|Author Name: Another comment"
                        const commentParts = record.comments.split('|').filter(c => c.trim());
                        
                        for (const commentPart of commentParts) {
                            const colonIndex = commentPart.indexOf(':');
                            if (colonIndex > 0) {
                                const authorName = commentPart.substring(0, colonIndex).trim();
                                const commentText = commentPart.substring(colonIndex + 1).trim();
                                
                                if (commentText) {
                                    // Try to match author to a user
                                    const commentUser = usersByName[authorName.toLowerCase()];
                                    const commentEmail = commentUser ? commentUser.email : null;
                                    
                                    await base44.asServiceRole.entities.Comment.create({
                                        task_id: createdTask.id,
                                        text: commentText,
                                        created_by: commentEmail || 'imported@system.com',
                                    });
                                    stats.commentsCreated++;
                                }
                            }
                        }
                    } catch (error) {
                        stats.errors.push(`Failed to import comments for "${record.name}": ${error.message}`);
                    }
                }

                // Parse and create checklists
                if (record.checklists) {
                    try {
                        // Checklists format: "Checklist Title: Item 1, Item 2|Another Checklist: Item A, Item B"
                        const checklistParts = record.checklists.split('|').filter(c => c.trim());
                        
                        for (let checklistIndex = 0; checklistIndex < checklistParts.length; checklistIndex++) {
                            const checklistPart = checklistParts[checklistIndex];
                            const colonIndex = checklistPart.indexOf(':');
                            
                            if (colonIndex > 0) {
                                const checklistTitle = checklistPart.substring(0, colonIndex).trim();
                                const itemsText = checklistPart.substring(colonIndex + 1).trim();
                                
                                if (checklistTitle) {
                                    // Create checklist
                                    const checklist = await base44.asServiceRole.entities.Checklist.create({
                                        task_id: createdTask.id,
                                        title: checklistTitle,
                                        position: checklistIndex,
                                    });
                                    stats.checklistsCreated++;
                                    
                                    // Create checklist items
                                    const items = itemsText.split(',').map(item => item.trim()).filter(item => item);
                                    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                                        await base44.asServiceRole.entities.ChecklistItem.create({
                                            checklist_id: checklist.id,
                                            text: items[itemIndex],
                                            completed: false,
                                            position: itemIndex,
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        stats.errors.push(`Failed to import checklists for "${record.name}": ${error.message}`);
                    }
                }

                // Small delay to avoid rate limiting
                await delay(100);

            } catch (error) {
                stats.errors.push(`Failed to import task "${record.name}": ${error.message}`);
            }
        }

        console.log('Import completed:', stats);

        return Response.json({
            success: true,
            message: `Import completed: ${stats.tasksCreated} tasks, ${stats.commentsCreated} comments, ${stats.checklistsCreated} checklists created`,
            stats: {
                tasksCreated: stats.tasksCreated,
                commentsCreated: stats.commentsCreated,
                checklistsCreated: stats.checklistsCreated,
                errors: stats.errors.slice(0, 10), // Return first 10 errors only
            },
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});