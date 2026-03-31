import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sourceBoardId, targetBoardId, tag } = await req.json();

        if (!sourceBoardId || !targetBoardId || !tag) {
            return Response.json({ error: 'sourceBoardId, targetBoardId, and tag are required' }, { status: 400 });
        }

        // Fetch source and target board columns
        const [sourceColumns, targetColumnsRaw, targetBoard] = await Promise.all([
            base44.asServiceRole.entities.Column.filter({ board_id: sourceBoardId }),
            base44.asServiceRole.entities.Column.filter({ board_id: targetBoardId }),
            base44.asServiceRole.entities.Board.filter({ id: targetBoardId }),
        ]);

        if (!targetBoard.length) {
            return Response.json({ error: 'Target board not found' }, { status: 404 });
        }

        const targetBoardMembers = targetBoard[0].members || [];

        // Build column maps
        const sourceColumnMap = {};
        sourceColumns.forEach(col => { sourceColumnMap[col.id] = col; });

        const targetColumnsByName = {};
        targetColumnsRaw.forEach(col => { targetColumnsByName[col.name.toLowerCase()] = col; });

        // Fetch all tasks from source board with the given tag
        const allSourceTasks = await base44.asServiceRole.entities.Task.filter({ board_id: sourceBoardId });
        const taggedTasks = allSourceTasks.filter(task =>
            task.tags && task.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );

        if (taggedTasks.length === 0) {
            return Response.json({ success: true, copied: 0, message: `No tasks found with tag "${tag}"` });
        }

        let copied = 0;
        const errors = [];

        for (const task of taggedTasks) {
            try {
                // Resolve target column
                const sourceCol = sourceColumnMap[task.column_id];
                const sourceColName = sourceCol ? sourceCol.name : 'Imported';
                let targetCol = targetColumnsByName[sourceColName.toLowerCase()];

                if (!targetCol) {
                    // Create the column in the target board
                    const newCol = await base44.asServiceRole.entities.Column.create({
                        board_id: targetBoardId,
                        name: sourceColName,
                        position: Object.keys(targetColumnsByName).length,
                        color: sourceCol?.color || 'blue',
                    });
                    targetCol = newCol;
                    targetColumnsByName[sourceColName.toLowerCase()] = newCol;
                }

                // Determine assignment: only keep if user is member of target board
                const assignedTo = task.assigned_to && targetBoardMembers.includes(task.assigned_to)
                    ? task.assigned_to
                    : null;

                // Create the task copy
                const newTask = await base44.asServiceRole.entities.Task.create({
                    board_id: targetBoardId,
                    column_id: targetCol.id,
                    title: task.title,
                    description: task.description || '',
                    assigned_to: assignedTo,
                    due_date: task.due_date || null,
                    tags: task.tags || [],
                    tag_colors: task.tag_colors || {},
                    priority: task.priority || 'medium',
                    status: task.status || 'active',
                    position: task.position || 0,
                    is_recurring: false,
                });

                await delay(50);

                // Copy sub-entities in parallel
                const [comments, subtasks, checklists, attachments] = await Promise.all([
                    base44.asServiceRole.entities.Comment.filter({ task_id: task.id }),
                    base44.asServiceRole.entities.Subtask.filter({ parent_task_id: task.id }),
                    base44.asServiceRole.entities.Checklist.filter({ task_id: task.id }),
                    base44.asServiceRole.entities.Attachment.filter({ task_id: task.id }),
                ]);

                // Copy comments
                for (const comment of comments) {
                    await base44.asServiceRole.entities.Comment.create({
                        task_id: newTask.id,
                        text: comment.text,
                        mentions: comment.mentions || [],
                    });
                    await delay(30);
                }

                // Copy subtasks
                for (const subtask of subtasks) {
                    const subtaskAssignee = subtask.assigned_to && targetBoardMembers.includes(subtask.assigned_to)
                        ? subtask.assigned_to : null;
                    await base44.asServiceRole.entities.Subtask.create({
                        parent_task_id: newTask.id,
                        title: subtask.title,
                        completed: subtask.completed || false,
                        assigned_to: subtaskAssignee,
                        position: subtask.position || 0,
                    });
                    await delay(30);
                }

                // Copy checklists and their items
                for (const checklist of checklists) {
                    const newChecklist = await base44.asServiceRole.entities.Checklist.create({
                        task_id: newTask.id,
                        title: checklist.title,
                        position: checklist.position || 0,
                    });
                    await delay(30);

                    const items = await base44.asServiceRole.entities.ChecklistItem.filter({ checklist_id: checklist.id });
                    for (const item of items) {
                        await base44.asServiceRole.entities.ChecklistItem.create({
                            checklist_id: newChecklist.id,
                            text: item.text,
                            completed: item.completed || false,
                            position: item.position || 0,
                        });
                        await delay(20);
                    }
                }

                // Copy attachments (reuse file URLs)
                for (const attachment of attachments) {
                    await base44.asServiceRole.entities.Attachment.create({
                        task_id: newTask.id,
                        file_url: attachment.file_url,
                        file_name: attachment.file_name,
                        file_size: attachment.file_size || 0,
                        file_type: attachment.file_type || '',
                    });
                    await delay(20);
                }

                // Log activity
                await base44.asServiceRole.entities.ActivityLog.create({
                    task_id: newTask.id,
                    action_type: 'created',
                    action_description: `Task copied from another board with tag "${tag}" by ${user.full_name}`,
                    user_email: user.email,
                });

                copied++;
            } catch (err) {
                errors.push(`Failed to copy "${task.title}": ${err.message}`);
            }
        }

        return Response.json({
            success: true,
            copied,
            total: taggedTasks.length,
            errors: errors.slice(0, 10),
            message: `Successfully copied ${copied} of ${taggedTasks.length} tasks with tag "${tag}"`,
        });

    } catch (error) {
        console.error('copyTaggedTasks error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});