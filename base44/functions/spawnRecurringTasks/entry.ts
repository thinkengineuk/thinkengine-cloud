import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function addInterval(date, pattern) {
  const d = new Date(date); // always clone to avoid mutation
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

function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let spawned = 0;

  const today = toDateOnly(new Date());
  const todayStr = today.toISOString().split('T')[0];

  // --- Spawn from recurring Task templates ---
  const recurringTasks = await base44.asServiceRole.entities.Task.filter({ is_recurring: true });

  for (const template of recurringTasks) {
    if (!template.recurrence_start_date) continue;

    const startDate = toDateOnly(new Date(template.recurrence_start_date));
    const lastSpawned = template.last_spawned_date ? toDateOnly(new Date(template.last_spawned_date)) : null;

    // Calculate next spawn date
    const nextSpawnDate = lastSpawned
      ? toDateOnly(addInterval(lastSpawned, template.recurrence_pattern))
      : startDate;

    if (today >= nextSpawnDate) {
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
        due_date: nextSpawnDate.toISOString(),
      });
      await base44.asServiceRole.entities.Task.update(template.id, { last_spawned_date: todayStr });
      spawned++;
      console.log(`Spawned task template: "${template.title}" with due_date: ${nextSpawnDate.toISOString()}`);
    }
  }

  // --- Spawn from RecurringAutomation entities ---
  const automations = await base44.asServiceRole.entities.RecurringAutomation.filter({ is_active: true });

  // Get current time in Europe/London
  const nowLondon = new Date(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));

  for (const automation of automations) {
    if (!automation.recurrence_start_date) continue;

    // Check scheduled_time against London local time
    if (automation.scheduled_time) {
      const [schedHour, schedMin] = automation.scheduled_time.split(':').map(Number);
      const londonHour = nowLondon.getHours();
      const londonMin = nowLondon.getMinutes();
      if (londonHour < schedHour || (londonHour === schedHour && londonMin < schedMin)) {
        console.log(`Skipping "${automation.title}" — scheduled time not yet reached (${automation.scheduled_time} London)`);
        continue;
      }
    }

    const startDate = toDateOnly(new Date(automation.recurrence_start_date));
    const lastSpawned = automation.last_spawned_date ? toDateOnly(new Date(automation.last_spawned_date)) : null;

    const nextSpawnDate = lastSpawned
      ? toDateOnly(addInterval(lastSpawned, automation.recurrence_pattern))
      : startDate;

    if (today >= nextSpawnDate) {
      const newTask = await base44.asServiceRole.entities.Task.create({
        board_id: automation.board_id,
        column_id: automation.column_id,
        title: automation.title,
        description: automation.description || undefined,
        assigned_to: automation.assigned_to || undefined,
        watchers: automation.watchers || [],
        priority: automation.priority || 'medium',
        tags: automation.tags || [],
        status: 'active',
        position: 9999,
        due_date: nextSpawnDate.toISOString(),
      });

      // Create checklist if automation has checklist items
      if (automation.checklist_items?.length > 0) {
        const checklist = await base44.asServiceRole.entities.Checklist.create({
          task_id: newTask.id,
          title: 'Checklist',
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
      console.log(`Spawned automation task: "${automation.title}" with due_date: ${nextSpawnDate.toISOString()}`);
    }
  }

  return Response.json({ success: true, spawned, checked: recurringTasks.length + automations.length });
});