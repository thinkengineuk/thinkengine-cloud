import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const UPCOMING_TASKS_COL_ID = '69d4d769e797d94e49edffa5';
const TOMORROW_COL_ID = '69d4d7683036fb078175e45a';
const BOARD_ID = '69d4d6504c4765df04fb98e0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Calculate today's date in Europe/London timezone
  const now = new Date();
  const londonDateStr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const todayStr = londonDateStr.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if Tomorrow column is empty first — only pull when empty
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

  // Find the earliest future due date among upcoming tasks (strictly after today)
  const futureTasks = tasks.filter(task => task.due_date && task.due_date.slice(0, 10) > todayStr);

  if (!futureTasks.length) {
    return Response.json({ message: 'No upcoming tasks with future due dates', todayDate: todayStr, checked: tasks.length });
  }

  const earliestDueDate = futureTasks
    .map(t => t.due_date.slice(0, 10))
    .sort()[0];

  // Filter tasks due on that earliest date
  const tasksToMove = futureTasks.filter(task => task.due_date.slice(0, 10) === earliestDueDate);

  await Promise.all(tasksToMove.map((task, i) =>
    base44.asServiceRole.entities.Task.update(task.id, {
      column_id: TOMORROW_COL_ID,
      position: i,
    })
  ));

  return Response.json({
    message: `Moved ${tasksToMove.length} task(s) due ${earliestDueDate} to Tomorrow column`,
    dueDate: earliestDueDate,
    moved: tasksToMove.map(t => t.title),
  });
});