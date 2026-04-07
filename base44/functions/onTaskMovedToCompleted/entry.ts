import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function formatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildEmailHtml({ subject, greeting, introHtml, conversationItems, ctaUrl }) {
  const conversationHtml = conversationItems && conversationItems.length > 0 ? `
    <div style="margin:24px 0 0 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#64748b;text-transform:uppercase;margin-bottom:12px;">Conversation</div>
      ${conversationItems.map(item => `
        <div style="border-left:3px solid #3b82f6;padding:10px 16px;margin-bottom:12px;background:#f8fafc;border-radius:0 6px 6px 0;">
          <div style="font-size:13px;margin-bottom:6px;">
            <span style="font-weight:600;color:#1e293b;">${item.authorName}</span>
            <span style="color:#94a3b8;margin-left:8px;font-size:12px;">${item.timestamp}</span>
          </div>
          <div style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${item.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">TASKFLOW</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">${subject}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            ${greeting ? `<p style="font-size:15px;color:#1e293b;margin:0 0 12px 0;">${greeting}</p>` : ''}
            ${introHtml ? `<div style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:20px;">${introHtml}</div>` : ''}
            ${conversationHtml}
            ${ctaUrl ? `
            <div style="text-align:center;margin:28px 0 8px 0;">
              <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View Task →</a>
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
            <div style="font-size:12px;color:#94a3b8;">TaskFlow Task Management · Automated Message</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data: task, old_data, changed_fields } = payload;

    if (!task || !task.id) {
      return Response.json({ message: 'No task data' });
    }

    const changedFields = changed_fields || [];
    const columnChanged = changedFields.includes('column_id');
    const statusChangedToCompleted = changedFields.includes('status') && task.status === 'completed' && old_data?.status !== 'completed';

    // Determine if this is a completion event via column move
    let isCompletedByColumnMove = false;
    if (columnChanged) {
      const columns = await base44.asServiceRole.entities.Column.filter({ id: task.column_id });
      if (columns && columns.length > 0) {
        isCompletedByColumnMove = columns[0].name.toLowerCase() === 'completed';
      }
    }

    const isCompletionEvent = isCompletedByColumnMove || statusChangedToCompleted;

    if (!isCompletionEvent) {
      return Response.json({ message: 'Not a completion event, skipping' });
    }

    // Avoid re-triggering if already marked completed
    if (task.status === 'completed' && task.completed_at && !statusChangedToCompleted && !isCompletedByColumnMove) {
      return Response.json({ message: 'Task already completed, skipping' });
    }

    const completedAt = task.completed_at || new Date().toISOString();
    const updates = {};

    // Set status + completed_at if not already set
    if (task.status !== 'completed') updates.status = 'completed';
    if (!task.completed_at) updates.completed_at = completedAt;

    // If completed by status change, move to "Completed" column if one exists
    if (statusChangedToCompleted && !columnChanged) {
      const allColumns = await base44.asServiceRole.entities.Column.filter({ board_id: task.board_id });
      const completedColumn = (allColumns || []).find(c => c.name.toLowerCase() === 'completed');
      if (completedColumn && task.column_id !== completedColumn.id) {
        updates.column_id = completedColumn.id;
      }
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Task.update(task.id, updates);
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      task_id: task.id,
      action_type: 'completed',
      action_description: `Task marked as completed at ${formatTimestamp(completedAt)}`,
      user_email: 'system',
    });

    // Gather recipients
    const recipientEmails = new Set();
    if (task.assigned_to) recipientEmails.add(task.assigned_to);
    if (Array.isArray(task.watchers)) task.watchers.forEach(e => recipientEmails.add(e));

    if (recipientEmails.size === 0) {
      return Response.json({ message: 'Task completed, no recipients to notify' });
    }

    const [comments, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Comment.filter({ task_id: task.id }, 'created_date', 5),
      base44.asServiceRole.entities.User.list(),
    ]);

    const userMap = {};
    allUsers.forEach(u => { userMap[u.email] = u; });

    const conversationItems = comments.map(c => ({
      authorName: userMap[c.created_by]?.full_name || c.created_by || 'Unknown',
      timestamp: formatTimestamp(c.created_date),
      text: c.text,
    }));

    const appUrl = Deno.env.get('APP_URL') || 'https://taskflow.base44.app';
    const taskUrl = `${appUrl}/Board?id=${task.board_id}&taskId=${task.id}`;
    const completedAtFormatted = formatTimestamp(completedAt);

    const sendPromises = Array.from(recipientEmails).map(async (email) => {
      const recipient = userMap[email];
      const html = buildEmailHtml({
        subject: `Task Completed ✓`,
        greeting: `Hi ${recipient?.full_name || 'there'},`,
        introHtml: `The task <strong>${task.title}</strong> has been marked as <strong>completed</strong>.<br/><br/>
          <span style="color:#64748b;font-size:14px;">Completed at: <strong>${completedAtFormatted}</strong></span>`,
        conversationItems,
        ctaUrl: taskUrl,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[TaskFlow] Task Completed: ${task.title}`,
        body: html,
      });
    });

    await Promise.all(sendPromises);

    return Response.json({ message: `Task completed and notified ${recipientEmails.size} recipient(s)` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});