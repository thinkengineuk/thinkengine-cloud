import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { boardId } = await req.json();

        if (!boardId) {
            return Response.json({ error: 'Board ID required' }, { status: 400 });
        }

        console.log(`Deleting board ${boardId}...`);

        // Get all columns for this board
        const columns = await base44.asServiceRole.entities.Column.filter({ board_id: boardId });
        console.log(`Found ${columns.length} columns to delete`);

        // Delete all tasks in each column
        let tasksDeleted = 0;
        for (const column of columns) {
            const tasks = await base44.asServiceRole.entities.Task.filter({ column_id: column.id });
            
            for (const task of tasks) {
                try {
                    // Delete related entities first
                    const comments = await base44.asServiceRole.entities.Comment.filter({ task_id: task.id });
                    for (const comment of comments) {
                        await base44.asServiceRole.entities.Comment.delete(comment.id);
                    }

                    const attachments = await base44.asServiceRole.entities.Attachment.filter({ task_id: task.id });
                    for (const attachment of attachments) {
                        await base44.asServiceRole.entities.Attachment.delete(attachment.id);
                    }

                    const checklists = await base44.asServiceRole.entities.Checklist.filter({ task_id: task.id });
                    for (const checklist of checklists) {
                        const items = await base44.asServiceRole.entities.ChecklistItem.filter({ checklist_id: checklist.id });
                        for (const item of items) {
                            await base44.asServiceRole.entities.ChecklistItem.delete(item.id);
                        }
                        await base44.asServiceRole.entities.Checklist.delete(checklist.id);
                    }

                    const subtasks = await base44.asServiceRole.entities.Subtask.filter({ parent_task_id: task.id });
                    for (const subtask of subtasks) {
                        await base44.asServiceRole.entities.Subtask.delete(subtask.id);
                    }

                    const activities = await base44.asServiceRole.entities.ActivityLog.filter({ task_id: task.id });
                    for (const activity of activities) {
                        await base44.asServiceRole.entities.ActivityLog.delete(activity.id);
                    }

                    // Finally delete the task
                    await base44.asServiceRole.entities.Task.delete(task.id);
                    tasksDeleted++;
                } catch (error) {
                    console.warn(`Error deleting task ${task.id}:`, error.message);
                }
            }

            // Delete the column
            try {
                await base44.asServiceRole.entities.Column.delete(column.id);
            } catch (error) {
                console.warn(`Error deleting column ${column.id}:`, error.message);
            }
        }

        // Finally delete the board
        await base44.asServiceRole.entities.Board.delete(boardId);

        console.log(`Board deleted successfully. Deleted ${tasksDeleted} tasks and ${columns.length} columns.`);

        return Response.json({
            success: true,
            message: `Board deleted successfully`,
            stats: {
                tasksDeleted,
                columnsDeleted: columns.length,
            }
        });

    } catch (error) {
        console.error('Delete board error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});