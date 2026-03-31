import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

        console.log(`Removing duplicate tasks from board ${boardId}...`);

        // Get all tasks for this board
        const allTasks = await base44.asServiceRole.entities.Task.filter({ board_id: boardId });
        
        console.log(`Found ${allTasks.length} total tasks`);

        // Group tasks by title and column_id only (simpler matching)
        const taskGroups = {};
        
        for (const task of allTasks) {
            const key = `${task.title.trim().toLowerCase()}_${task.column_id}`;
            
            if (!taskGroups[key]) {
                taskGroups[key] = [];
            }
            taskGroups[key].push(task);
        }

        // Find and remove duplicates
        let duplicatesRemoved = 0;
        const deletedIds = [];
        
        for (const key in taskGroups) {
            const tasks = taskGroups[key];
            
            if (tasks.length > 1) {
                // Sort by created_date (oldest first), then by ID as tiebreaker
                tasks.sort((a, b) => {
                    const dateCompare = new Date(a.created_date) - new Date(b.created_date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.id.localeCompare(b.id);
                });
                
                // Keep the first (oldest) task, delete the rest
                const toKeep = tasks[0];
                const toDelete = tasks.slice(1);
                
                console.log(`Found ${toDelete.length} duplicates of task "${toKeep.title}" in column ${toKeep.column_id}`);
                console.log(`Keeping task ID: ${toKeep.id}`);
                console.log(`Deleting task IDs: ${toDelete.map(t => t.id).join(', ')}`);
                
                for (const duplicate of toDelete) {
                    try {
                        // Delete related entities first (in parallel for speed)
                        const [comments, attachments, checklists, subtasks, activities] = await Promise.all([
                            base44.asServiceRole.entities.Comment.filter({ task_id: duplicate.id }),
                            base44.asServiceRole.entities.Attachment.filter({ task_id: duplicate.id }),
                            base44.asServiceRole.entities.Checklist.filter({ task_id: duplicate.id }),
                            base44.asServiceRole.entities.Subtask.filter({ parent_task_id: duplicate.id }),
                            base44.asServiceRole.entities.ActivityLog.filter({ task_id: duplicate.id })
                        ]);

                        // Delete checklist items first
                        const checklistItemPromises = [];
                        for (const checklist of checklists) {
                            const items = await base44.asServiceRole.entities.ChecklistItem.filter({ checklist_id: checklist.id });
                            for (const item of items) {
                                checklistItemPromises.push(base44.asServiceRole.entities.ChecklistItem.delete(item.id));
                            }
                        }
                        if (checklistItemPromises.length > 0) {
                            await Promise.all(checklistItemPromises);
                        }

                        // Delete all other related entities in parallel
                        const deletePromises = [
                            ...comments.map(c => base44.asServiceRole.entities.Comment.delete(c.id)),
                            ...attachments.map(a => base44.asServiceRole.entities.Attachment.delete(a.id)),
                            ...checklists.map(cl => base44.asServiceRole.entities.Checklist.delete(cl.id)),
                            ...subtasks.map(s => base44.asServiceRole.entities.Subtask.delete(s.id)),
                            ...activities.map(a => base44.asServiceRole.entities.ActivityLog.delete(a.id))
                        ];
                        
                        if (deletePromises.length > 0) {
                            await Promise.all(deletePromises);
                        }

                        // Delete the duplicate task
                        await base44.asServiceRole.entities.Task.delete(duplicate.id);
                        duplicatesRemoved++;
                        deletedIds.push(duplicate.id);
                        
                        console.log(`Successfully deleted duplicate task ${duplicate.id}`);
                    } catch (error) {
                        console.error(`Error deleting duplicate task ${duplicate.id}:`, error);
                    }
                }
            }
        }

        console.log(`Successfully removed ${duplicatesRemoved} duplicate tasks`);
        console.log(`Deleted task IDs: ${deletedIds.join(', ')}`);

        return Response.json({
            success: true,
            message: `Removed ${duplicatesRemoved} duplicate tasks`,
            duplicatesRemoved,
            deletedIds,
        });

    } catch (error) {
        console.error('Remove duplicates error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});