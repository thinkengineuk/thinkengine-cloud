import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    // Get all completed, non-archived tasks
    const allTasks = await base44.asServiceRole.entities.Task.filter({ status: 'completed', is_archived: false });

    const toArchive = allTasks.filter(task => {
      const completedAt = task.completed_at;
      if (!completedAt) return false;
      return new Date(completedAt) < new Date(cutoff);
    });

    let archived = 0;
    for (const task of toArchive) {
      await base44.asServiceRole.entities.Task.update(task.id, {
        is_archived: true,
        archived_at: new Date().toISOString(),
      });
      archived++;
    }

    return Response.json({ success: true, archived, total_checked: allTasks.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});