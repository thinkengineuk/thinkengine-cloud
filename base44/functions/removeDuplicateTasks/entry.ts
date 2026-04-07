import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateId() {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        const allTasks = await base44.asServiceRole.entities.Task.filter({ board_id: boardId });
        console.log(`Found ${allTasks.length} total tasks`);

        // Group tasks by title (normalised) + column_id
        const taskGroups = {};
        for (const task of allTasks) {
            const key = `${task.title.trim().toLowerCase()}_${task.column_id}`;
            if (!taskGroups[key]) taskGroups[key] = [];
            taskGroups[key].push(task);
        }

        let duplicatesRemoved = 0;
        const deletedIds = [];

        for (const key in taskGroups) {
            const tasks = taskGroups[key];
            if (tasks.length <= 1) continue;

            // Keep the oldest, delete the rest
            tasks.sort((a, b) => {
                const dateCompare = new Date(a.created_date) - new Date(b.created_date);
                return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id);
            });

            const toKeep = tasks[0];
            const toDelete = tasks.slice(1);

            console.log(`Found ${toDelete.length} duplicate(s) of "${toKeep.title}" — keeping ${toKeep.id}`);

            for (const duplicate of toDelete) {
                try {
                    // Fetch related entities sequentially to stay under rate limits
                    const comments = await base44.asServiceRole.entities.Comment.filter({ task_id: duplicate.id });
                    await sleep(150);
                    const attachments = await base44.asServiceRole.entities.Attachment.filter({ task_id: duplicate.id });
                    await sleep(150);
                    const checklists = await base44.asServiceRole.entities.Checklist.filter({ task_id: duplicate.id });
                    await sleep(150);
                    const subtasks = await base44.asServiceRole.entities.Subtask.filter({ parent_task_id: duplicate.id });
                    await sleep(150);
                    const activities = await base44.asServiceRole.entities.ActivityLog.filter({ task_id: duplicate.id });
                    await sleep(150);

                    // Delete checklist items sequentially
                    for (const checklist of checklists) {
                        const items = await base44.asServiceRole.entities.ChecklistItem.filter({ checklist_id: checklist.id });
                        await sleep(100);
                        for (const item of items) {
                            await base44.asServiceRole.entities.ChecklistItem.delete(item.id);
                            await sleep(100);
                        }
                    }

                    // Delete all related entities sequentially
                    for (const c of comments)     { await base44.asServiceRole.entities.Comment.delete(c.id);     await sleep(100); }
                    for (const a of attachments)  { await base44.asServiceRole.entities.Attachment.delete(a.id);  await sleep(100); }
                    for (const cl of checklists)  { await base44.asServiceRole.entities.Checklist.delete(cl.id);  await sleep(100); }
                    for (const s of subtasks)     { await base44.asServiceRole.entities.Subtask.delete(s.id);     await sleep(100); }
                    for (const al of activities)  { await base44.asServiceRole.entities.ActivityLog.delete(al.id); await sleep(100); }

                    // Finally delete the duplicate task
                    await base44.asServiceRole.entities.Task.delete(duplicate.id);
                    await sleep(200);

                    duplicatesRemoved++;
                    deletedIds.push(duplicate.id);
                    console.log(`Deleted duplicate task ${duplicate.id}`);
                } catch (error) {
                    console.error(`Error deleting duplicate task ${duplicate.id}:`, error.message);
                }
            }
        }

        console.log(`Done. Removed ${duplicatesRemoved} duplicate tasks.`);

        return Response.json({
            success: true,
            message: `Removed ${duplicatesRemoved} duplicate tasks`,
            duplicatesRemoved,
            deletedIds,
        });

    } catch (error) {
        console.error('Remove duplicates error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});