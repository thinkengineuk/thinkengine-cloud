import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Get all active tasks with due dates
        const allTasks = await base44.asServiceRole.entities.Task.filter({ status: 'active' });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let remindersSent = 0;
        const errors = [];

        for (const task of allTasks) {
            if (!task.due_date || !task.assigned_to) continue;
            
            try {
                const dueDate = new Date(task.due_date);
                dueDate.setHours(0, 0, 0, 0);
                
                // Check if task is overdue
                if (dueDate < today) {
                    // Get task details
                    const [boardData, users] = await Promise.all([
                        base44.asServiceRole.entities.Board.filter({ id: task.board_id }),
                        base44.asServiceRole.entities.User.list()
                    ]);
                    
                    const board = boardData[0];
                    const assignedUser = users.find(u => u.email === task.assigned_to);
                    
                    if (!assignedUser) continue;
                    
                    const taskUrl = `${req.headers.get('origin') || 'https://your-app.com'}/Board?id=${task.board_id}&taskId=${task.id}`;
                    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    
                    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 24px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin: 0; }
    .content { padding: 32px 24px; }
    .title { font-size: 24px; font-weight: 600; color: #1e293b; margin: 0 0 24px 0; }
    .greeting { font-size: 16px; color: #475569; margin: 0 0 24px 0; }
    .notification { font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 24px 0; }
    .task-link { color: #0891b2; text-decoration: none; font-weight: 600; }
    .task-link:hover { text-decoration: underline; }
    .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px; }
    .warning-text { color: #991b1b; font-weight: 600; margin: 0; }
    .task-info { background-color: #f8fafc; padding: 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
    .task-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
    .task-board { color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; margin: 24px 0; font-size: 16px; }
    .button:hover { opacity: 0.9; }
    .footer { padding: 24px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">TaskFlow</h1>
    </div>
    <div class="content">
      <h2 class="title">⚠️ Task Overdue Reminder</h2>
      <p class="greeting">Hello ${assignedUser.full_name},</p>
      <div class="warning-box">
        <p class="warning-text">This task is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</p>
      </div>
      <p class="notification">
        The task <a href="${taskUrl}" class="task-link">${task.title}</a> 
        in the <strong>${board?.name}</strong> project was due on <strong>${new Date(task.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
      </p>
      <div class="task-info">
        <div class="task-title">${task.title}</div>
        <div class="task-board">Project: ${board?.name}</div>
        ${task.description ? `<div style="color: #475569; font-size: 14px; margin-top: 12px;">${task.description}</div>` : ''}
      </div>
      <p class="notification">
        Please take action on this task or move it to the Completed column if it's already done.
      </p>
      <a href="${taskUrl}" class="button">View Task</a>
    </div>
    <div class="footer">
      This is an automated reminder from TaskFlow Task Management
    </div>
  </div>
</body>
</html>`;

                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: task.assigned_to,
                        subject: `⚠️ Overdue: "${task.title}" was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`,
                        body: htmlBody,
                    });
                    
                    remindersSent++;
                    console.log(`Sent overdue reminder for task ${task.id} to ${task.assigned_to}`);
                }
            } catch (error) {
                console.error(`Error processing task ${task.id}:`, error);
                errors.push(`Task ${task.id}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            message: `Sent ${remindersSent} overdue reminders`,
            remindersSent,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Send overdue reminders error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});