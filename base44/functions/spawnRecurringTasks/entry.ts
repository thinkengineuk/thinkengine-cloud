import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addInterval(date, pattern) {
  const d = new Date(date);
  switch (pattern) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case '3_monthly': d.setMonth(d.getMonth() + 3); break;
    case '6_monthly': d.setMonth(d.getMonth() + 6); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let spawned = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // --- Spawn from recurring Task templates ---
  const recurringTasks = await base44.asServiceRole.entities.Task.filter({ is_recurring: true });

  for (const template of recurringTasks) {
    const startDate = template.recurrence_start_date ? new Date(template.recurrence_start_date) : null;
    if (!startDate) continue;

    const lastSpawned = template.last_spawned_date ? new Date(template.last_spawned_date) : null;
    let nextSpawnDate = lastSpawned ? addInterval(lastSpawned, template.recurrence_pattern) : startDate;
    nextSpawnDate.setHours(0, 0, 0, 0);

    if (today >= nextSpawnDate) {
      const todayStr = today.toISOString().split('T')[0];
      await base44.asServiceRole.entities.Task.create({
        board_id: template.board_id,
        column_id: template.column_id,
        title: template.title,
        description: template.description || undefined,
        assigned_to: template.assigned_to || undefined,
        watchers: template.watchers || [],
        priority: template.priority || 'medium',
        status: 'active',
        parent_recurring_task_id: template.id,
        position: 9999,
        tags: template.tags || [],
      });
      await base44.asServiceRole.entities.Task.update(template.id, { last_spawned_date: todayStr });
      spawned++;
      console.log(`Spawned task template: "${template.title}"`);
    }
  }

  // --- Spawn from RecurringAutomation entities ---
  const automations = await base44.asServiceRole.entities.RecurringAutomation.filter({ is_active: true });

  for (const automation of automations) {
    const startDate = automation.recurrence_start_date ? new Date(automation.recurrence_start_date) : null;
    if (!startDate) continue;

    // Check scheduled_time — only spawn if current hour:min >= scheduled_time
    const [schedHour, schedMin] = (automation.scheduled_time || '00:00').split(':').map(Number);
    const now = new Date();
    const todayAtScheduledTime = new Date(today);
    todayAtScheduledTime.setHours(schedHour, schedMin, 0, 0);
    if (now < todayAtScheduledTime) continue; // Not yet time today

    const lastSpawned = automation.last_spawned_date ? new Date(automation.last_spawned_date) : null;
    let nextSpawnDate = lastSpawned ? addInterval(lastSpawned, automation.recurrence_pattern) : startDate;
    nextSpawnDate.setHours(0, 0, 0, 0);

    if (today >= nextSpawnDate) {
      const todayStr = today.toISOString().split('T')[0];
      const newTask = await base44.asServiceRole.entities.Task.create({
        board_id: automation.board_id,
        column_id: automation.column_id,
        title: automation.title,
        description: automation.description || undefined,
        assigned_to: automation.assigned_to || undefined,
        watchers: automation.watchers || [],
        priority: automation.priority || 'medium',
        status: 'active',
        position: 9999,
      });

      // Create checklist if automation has checklist items
      if (automation.checklist_items?.length > 0) {
        const checklist = await base44.asServiceRole.entities.Checklist.create({
          task_id: newTask.id,
          title: "Checklist",
          position: 0,
        });
        for (let i = 0; i < automation.checklist_items.length; i++) {
          await base44.asServiceRole.entities.ChecklistItem.create({
            checklist_id: checklist.id,
            text: automation.checklist_items[i],
            completed: false,
            position: i,
          });
        }
      }

      await base44.asServiceRole.entities.RecurringAutomation.update(automation.id, { last_spawned_date: todayStr });
      spawned++;
      console.log(`Spawned automation task: "${automation.title}"`);
    }
  }

  return Response.json({ success: true, spawned, checked: recurringTasks.length + automations.length });
});