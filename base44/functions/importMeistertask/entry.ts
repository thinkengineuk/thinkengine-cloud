import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { jsonData, targetBoardId, previewOnly } = body;

        if (!jsonData) {
            return Response.json({ error: 'No JSON data provided' }, { status: 400 });
        }

        // Parse the Meistertask JSON — support top-level or nested under "project"
        let projectData = jsonData;
        if (jsonData.project) projectData = jsonData.project;

        // Extract sections (columns) and tasks
        const sections = projectData.sections || projectData.lists || [];
        const projectName = projectData.name || 'Imported Project';

        if (sections.length === 0) {
            return Response.json({ error: 'No sections found in the JSON. Make sure this is a valid Meistertask project export.' }, { status: 400 });
        }

        // Build preview summary
        let totalTasks = 0;
        let totalChecklists = 0;
        const sectionSummary = sections.map(section => {
            const tasks = section.tasks || [];
            totalTasks += tasks.length;
            tasks.forEach(t => {
                if (t.checklist_items?.length) totalChecklists += t.checklist_items.length;
            });
            return { name: section.name, taskCount: tasks.length };
        });

        if (previewOnly) {
            return Response.json({
                success: true,
                preview: {
                    projectName,
                    sections: sectionSummary,
                    totalTasks,
                    totalChecklists,
                }
            });
        }

        // --- IMPORT ---
        if (!targetBoardId) {
            return Response.json({ error: 'No target board ID provided' }, { status: 400 });
        }

        const boards = await base44.asServiceRole.entities.Board.filter({ id: targetBoardId });
        const board = boards[0];
        if (!board) {
            return Response.json({ error: 'Board not found' }, { status: 404 });
        }

        // Load existing users for assignee matching
        const allUsers = await base44.asServiceRole.entities.User.list();
        const usersByName = {};
        allUsers.forEach(u => {
            usersByName[u.full_name?.toLowerCase()] = u;
        });

        // Load existing columns
        const existingColumns = await base44.asServiceRole.entities.Column.filter({ board_id: board.id });
        const columnsByName = {};
        existingColumns.forEach(col => {
            columnsByName[col.name.toLowerCase()] = col;
        });

        const stats = {
            tasksCreated: 0,
            checklistItemsCreated: 0,
            errors: [],
        };

        let taskPosition = 0;

        for (const section of sections) {
            const sectionName = section.name || 'Imported';
            let column = columnsByName[sectionName.toLowerCase()];

            // Create column if it doesn't exist
            if (!column) {
                try {
                    column = await base44.asServiceRole.entities.Column.create({
                        board_id: board.id,
                        name: sectionName,
                        position: Object.keys(columnsByName).length,
                        color: 'blue',
                    });
                    columnsByName[sectionName.toLowerCase()] = column;
                } catch (err) {
                    stats.errors.push(`Failed to create column "${sectionName}": ${err.message}`);
                    continue;
                }
            }

            const tasks = section.tasks || [];

            for (const task of tasks) {
                try {
                    // Labels → tags
                    const labels = task.labels || task.tags || [];
                    const tags = labels.map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean);

                    // Priority from labels
                    let priority = 'medium';
                    if (tags.some(t => t.toLowerCase() === 'high')) priority = 'high';
                    else if (tags.some(t => t.toLowerCase() === 'low')) priority = 'low';

                    // Status: Meistertask status 8 = completed
                    const status = (task.status === 8 || task.status === 'completed') ? 'completed' : 'active';

                    // Due date
                    let dueDate = null;
                    if (task.due_date) {
                        try {
                            const parsed = new Date(task.due_date);
                            if (!isNaN(parsed.getTime())) {
                                dueDate = parsed.toISOString().split('T')[0];
                            }
                        } catch (_) {}
                    }

                    // Assignee matching by name
                    let assignedTo = null;
                    const assignees = task.assignees || [];
                    if (assignees.length > 0) {
                        const firstName = assignees[0];
                        const assigneeName = typeof firstName === 'string' ? firstName : firstName.name;
                        if (assigneeName) {
                            const matchedUser = usersByName[assigneeName.toLowerCase()];
                            if (matchedUser) assignedTo = matchedUser.email;
                        }
                    }

                    const createdTask = await base44.asServiceRole.entities.Task.create({
                        board_id: board.id,
                        column_id: column.id,
                        title: task.name || 'Untitled Task',
                        description: task.notes || '',
                        assigned_to: assignedTo,
                        due_date: dueDate,
                        tags,
                        priority,
                        status,
                        position: taskPosition++,
                    });
                    stats.tasksCreated++;

                    // Checklist items
                    const checklistItems = task.checklist_items || task.checklist || [];
                    if (checklistItems.length > 0) {
                        const checklist = await base44.asServiceRole.entities.Checklist.create({
                            task_id: createdTask.id,
                            title: 'Checklist',
                            position: 0,
                        });

                        for (let i = 0; i < checklistItems.length; i++) {
                            const item = checklistItems[i];
                            await base44.asServiceRole.entities.ChecklistItem.create({
                                checklist_id: checklist.id,
                                text: typeof item === 'string' ? item : item.name || item.text || 'Item',
                                completed: item.checked || item.completed || false,
                                position: i,
                            });
                            stats.checklistItemsCreated++;
                        }
                    }

                    await delay(80);

                } catch (err) {
                    stats.errors.push(`Failed to import task "${task.name}": ${err.message}`);
                }
            }
        }

        console.log('Meistertask import completed:', stats);

        return Response.json({
            success: true,
            message: `Import complete: ${stats.tasksCreated} tasks and ${stats.checklistItemsCreated} checklist items created.`,
            stats,
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});