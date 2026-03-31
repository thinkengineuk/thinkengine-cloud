import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateId() {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await req.json();

        if (!taskId) {
            return Response.json({ error: 'taskId is required' }, { status: 400 });
        }

        const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
        if (tasks.length === 0) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        const task = tasks[0];
        const now = new Date();
        const timeEntries = [...(task.time_entries || [])];

        // Find open entry for this user (no ended_at)
        const activeIndex = timeEntries.findIndex(
            (e) => e.user_id === user.email && !e.ended_at
        );

        let action;
        if (activeIndex !== -1) {
            // STOP timer
            const entry = timeEntries[activeIndex];
            const startedAt = new Date(entry.started_at);
            const durationMs = now.getTime() - startedAt.getTime();
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

            timeEntries[activeIndex] = {
                ...entry,
                ended_at: now.toISOString(),
                duration: durationMinutes,
            };

            const actualMinutes = (task.actual_minutes || 0) + durationMinutes;
            await base44.asServiceRole.entities.Task.update(taskId, {
                time_entries: timeEntries,
                actual_minutes: actualMinutes,
            });
            action = 'stopped';
        } else {
            // START timer
            const newEntry = {
                id: generateId(),
                started_at: now.toISOString(),
                user_id: user.email,
                user_name: user.full_name || user.email,
            };
            timeEntries.push(newEntry);

            await base44.asServiceRole.entities.Task.update(taskId, {
                time_entries: timeEntries,
            });
            action = 'started';
        }

        // Return updated task
        const updatedTasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
        return Response.json({ success: true, action, task: updatedTasks[0] });

    } catch (error) {
        console.error('toggleTaskTimer error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});