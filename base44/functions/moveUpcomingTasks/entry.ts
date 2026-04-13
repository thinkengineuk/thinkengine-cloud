import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const UPCOMING_TASKS_COL_ID = '69d4d769e797d94e49edffa5';
const TOMORROW_COL_ID = '69d4d7683036fb078175e45a';
const BOARD_ID = '69d4d6504c4765df04fb98e0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Calculate tomorrow's date in Europe/London timezone
  const now = new Date();
  const londonDateStr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const tomorrow = new Date(londonDateStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if Tomorrow column is empty first
  const tomorrowExisting = await base44.asServiceRole.entities.Task.filter({
    board_id: BOARD_ID,
    column_id: TOMORROW_COL_ID,
    status: 'active',
  });

  if (tomorrowExisting.length > 0) {
    return Response.json({ message: 'Tomorrow column is not empty, skipping move', count: tomorrowExisting.length });
  }

  // Fetch active tasks in Upcoming Tasks column
  const tasks = await base44.asServiceRole.entities.Task.filter({
    board_id: BOARD_ID,
    column_id: UPCOMING_TASKS_COL_ID,
    status: 'active',
  });

  // Filter to tasks due tomorrow
  const tasksDueTomorrow = tasks.filter(task => {
    if (!task.due_date) return false;
    return task.due_date.slice(0, 10) === tomorrowStr;
  });

  if (!tasksDueTomorrow.length) {
    return Response.json({ message: 'No tasks due tomorrow', tomorrowDate: tomorrowStr, checked: tasks.length });
  }

  // Get current count in Tomorrow column to append positions
  const tomorrowTasks = await base44.asServiceRole.entities.Task.filter({
    board_id: BOARD_ID,
    column_id: TOMORROW_COL_ID,
  });
  const nextPosition = tomorrowTasks.length;

  await Promise.all(tasksDueTomorrow.map((task, i) =>
    base44.asServiceRole.entities.Task.update(task.id, {
      column_id: TOMORROW_COL_ID,
      position: nextPosition + i,
    })
  ));

  return Response.json({
    message: `Moved ${tasksDueTomorrow.length} task(s) to Tomorrow column`,
    tomorrowDate: tomorrowStr,
    moved: tasksDueTomorrow.map(t => t.title),
  });
});