import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await req.json();

        if (!taskId) {
            return Response.json({ error: 'Task ID required' }, { status: 400 });
        }

        console.log(`Deleting task ${taskId}...`);

        // Delete related entities first with delays to avoid rate limiting
        try {
            // Delete comments
            const comments = await base44.asServiceRole.entities.Comment.filter({ task_id: taskId });
            for (const comment of comments) {
                await base44.asServiceRole.entities.Comment.delete(comment.id);
                await delay(50);
            }
            console.log(`Deleted ${comments.length} comments`);

            // Delete attachments
            const attachments = await base44.asServiceRole.entities.Attachment.filter({ task_id: taskId });
            for (const attachment of attachments) {
                await base44.asServiceRole.entities.Attachment.delete(attachment.id);
                await delay(50);
            }
            console.log(`Deleted ${attachments.length} attachments`);

            // Delete checklist items and checklists
            const checklists = await base44.asServiceRole.entities.Checklist.filter({ task_id: taskId });
            for (const checklist of checklists) {
                const items = await base44.asServiceRole.entities.ChecklistItem.filter({ checklist_id: checklist.id });
                for (const item of items) {
                    await base44.asServiceRole.entities.ChecklistItem.delete(item.id);
                    await delay(50);
                }
                await base44.asServiceRole.entities.Checklist.delete(checklist.id);
                await delay(50);
            }
            console.log(`Deleted ${checklists.length} checklists`);

            // Delete subtasks
            const subtasks = await base44.asServiceRole.entities.Subtask.filter({ parent_task_id: taskId });
            for (const subtask of subtasks) {
                await base44.asServiceRole.entities.Subtask.delete(subtask.id);
                await delay(50);
            }
            console.log(`Deleted ${subtasks.length} subtasks`);

            // Delete activity logs
            const activities = await base44.asServiceRole.entities.ActivityLog.filter({ task_id: taskId });
            for (const activity of activities) {
                await base44.asServiceRole.entities.ActivityLog.delete(activity.id);
                await delay(50);
            }
            console.log(`Deleted ${activities.length} activity logs`);

            // Finally delete the task itself
            await base44.asServiceRole.entities.Task.delete(taskId);
            console.log(`Task ${taskId} deleted successfully`);

            return Response.json({
                success: true,
                message: 'Task deleted successfully',
            });

        } catch (error) {
            console.error('Error during deletion:', error);
            return Response.json({ error: error.message }, { status: 500 });
        }

    } catch (error) {
        console.error('Delete task error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});