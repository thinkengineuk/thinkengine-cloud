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
      ${[...conversationItems].reverse().map(item => `
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
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">THINKENGINE CLOUD</div>
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
              <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View Task &amp; Reply →</a>
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
           <div style="font-size:12px;color:#94a3b8;">ThinkEngine Cloud - Automated Message</div>
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
    const { task_id, changed_fields, updated_by_email, updated_by_name } = payload;

    if (!task_id) {
      return Response.json({ error: 'task_id is required' }, { status: 400 });
    }

    // Fetch task, comments, and all users
    const [task, comments, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Task.get(task_id),
      base44.asServiceRole.entities.Comment.filter({ task_id }, 'created_date', 10),
      base44.asServiceRole.entities.User.list(),
    ]);

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build recipient list: assigned_to + watchers, exclude the person who made the update
    const recipientEmails = new Set();
    if (task.assigned_to && task.assigned_to !== updated_by_email) {
      recipientEmails.add(task.assigned_to);
    }
    if (task.watchers && Array.isArray(task.watchers)) {
      task.watchers.forEach(email => {
        if (email !== updated_by_email) recipientEmails.add(email);
      });
    }

    if (recipientEmails.size === 0) {
      return Response.json({ message: 'No recipients to notify' });
    }

    // Build conversation history (last 5 comments)
    const userMap = {};
    allUsers.forEach(u => { userMap[u.email] = u; });

    const conversationItems = comments.slice(-5).map(c => ({
      authorName: userMap[c.created_by]?.full_name || c.created_by || 'Unknown',
      timestamp: formatTimestamp(c.created_date),
      text: c.text,
    }));

    // Describe what changed
    const fieldLabels = {
      title: 'Title',
      description: 'Description',
      assigned_to: 'Assignee',
      due_date: 'Due Date',
      status: 'Status',
      priority: 'Priority',
      column_id: 'Column / Stage',
      tags: 'Tags',
    };

    const changedLabels = (changed_fields || [])
      .map(f => fieldLabels[f] || f)
      .filter(Boolean);

    const changeDescription = changedLabels.length > 0
      ? `The following was updated: <strong>${changedLabels.join(', ')}</strong>.`
      : 'A task you are watching has been updated.';

    const taskUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/Board?id=${task.board_id}&taskId=${task.id}`;

    // Send to each recipient
    const sendPromises = Array.from(recipientEmails).map(async (email) => {
      const recipient = userMap[email];
      const html = buildEmailHtml({
        subject: `Task Updated · ${task.title}`,
        greeting: `Hi ${recipient?.full_name || 'there'},`,
        introHtml: `<strong>${updated_by_name || updated_by_email}</strong> updated the task <strong>${task.title}</strong>.<br/>${changeDescription}`,
        conversationItems,
        ctaUrl: taskUrl,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[ThinkEngine Cloud] Task Updated: ${task.title}`,
        body: html,
      });
    });

    await Promise.all(sendPromises);

    return Response.json({ message: `Notified ${recipientEmails.size} recipient(s)` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});