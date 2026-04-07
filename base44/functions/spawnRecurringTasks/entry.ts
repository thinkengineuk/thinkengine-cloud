import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Helper: add months to a date
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Helper: get interval in months for each pattern
function getIntervalMonths(pattern) {
  switch (pattern) {
    case 'monthly': return 1;
    case '3_monthly': return 3;
    case '6_monthly': return 6;
    default: return 1;
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all recurring template tasks
  const recurringTasks = await base44.asServiceRole.entities.Task.filter({ is_recurring: true });

  let spawned = 0;

  for (const template of recurringTasks) {
    const startDate = template.recurrence_start_date ? new Date(template.recurrence_start_date) : null;
    if (!startDate) continue;

    // Determine when the next spawn should happen
    const intervalMonths = getIntervalMonths(template.recurrence_pattern);
    const lastSpawned = template.last_spawned_date ? new Date(template.last_spawned_date) : null;

    let nextSpawnDate;
    if (!lastSpawned) {
      // Never spawned — first instance due on start date
      nextSpawnDate = startDate;
    } else {
      nextSpawnDate = addMonths(lastSpawned, intervalMonths);
    }

    nextSpawnDate.setHours(0, 0, 0, 0);

    if (today >= nextSpawnDate) {
      // Spawn a new task instance
      const todayStr = today.toISOString().split('T')[0];

      await base44.asServiceRole.entities.Task.create({
        board_id: template.board_id,
        column_id: template.column_id,
        title: template.title,
        description: template.description || undefined,
        assigned_to: template.assigned_to || undefined,
        priority: template.priority || 'medium',
        status: 'active',
        parent_recurring_task_id: template.id,
        position: 9999,
        tags: template.tags || [],
      });

      // Update the template's last_spawned_date
      await base44.asServiceRole.entities.Task.update(template.id, {
        last_spawned_date: todayStr,
      });

      spawned++;
      console.log(`Spawned task for template "${template.title}" (${template.recurrence_pattern})`);
    }
  }

  return Response.json({ success: true, spawned, checked: recurringTasks.length });
});