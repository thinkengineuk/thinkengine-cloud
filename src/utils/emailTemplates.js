/**
 * Shared email HTML generator for TaskFlow notifications.
 * Light-themed, clean design consistent across all notification types.
 */

export function generateEmailHtml({
  preheader = '',
  subject = '',
  greeting = '',
  introHtml = '',
  conversationItems = [],
  ctaUrl = '',
  ctaLabel = 'View Task & Reply',
  footerNote = 'ThinkEngine Cloud - Automated Message'
}) {
  const conversationHtml = conversationItems.length > 0 ? `
    <div style="margin: 24px 0 0 0;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase; margin-bottom: 12px;">Conversation</div>
      ${conversationItems.map(item => `
        <div style="border-left: 3px solid #3b82f6; padding: 10px 16px; margin-bottom: 12px; background: #f8fafc; border-radius: 0 6px 6px 0;">
          <div style="font-size: 13px; margin-bottom: 6px;">
            <span style="font-weight: 600; color: #1e293b;">${item.authorName}</span>
            <span style="color: #94a3b8; margin-left: 8px; font-size: 12px;">${item.timestamp}</span>
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${item.text}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">THINKENGINE CLOUD</div>
              <div style="font-size:22px;font-weight:700;color:#ffffff;">${subject}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${greeting ? `<p style="font-size:15px;color:#1e293b;margin:0 0 12px 0;">${greeting}</p>` : ''}
              ${introHtml ? `<div style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:20px;">${introHtml}</div>` : ''}
              ${conversationHtml}
              ${ctaUrl ? `
              <div style="text-align:center;margin:28px 0 8px 0;">
                <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">${ctaLabel}</a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
              <div style="font-size:12px;color:#94a3b8;">${footerNote}</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build assignment notification email HTML.
 */
export function buildAssignedEmail({ recipientName, assignerName, taskTitle, boardName, dueDate, taskUrl }) {
  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  return generateEmailHtml({
    subject: "You've been assigned to a task",
    greeting: `Hi ${recipientName || 'there'},`,
    introHtml: `<strong>${assignerName}</strong> assigned you to the task <strong>${taskTitle}</strong> in the <strong>${boardName}</strong> project.${dueDateStr ? `<br/><br/>Due: <strong>${dueDateStr}</strong>` : ''}`,
    ctaUrl: taskUrl,
    ctaLabel: 'View Task',
  });
}

/**
 * Build watcher notification email HTML.
 */
export function buildWatcherEmail({ recipientName, adderName, taskTitle, boardName, taskUrl }) {
  return generateEmailHtml({
    subject: "You're now watching a task",
    greeting: `Hi ${recipientName || 'there'},`,
    introHtml: `<strong>${adderName}</strong> added you as a watcher to the task <strong>${taskTitle}</strong> in the <strong>${boardName}</strong> project.<br/><br/>You'll be notified of updates to this task.`,
    ctaUrl: taskUrl,
    ctaLabel: 'View Task',
  });
}

/**
 * Build mention notification email HTML.
 */
export function buildMentionEmail({ recipientName, mentionerName, taskTitle, taskUrl, conversationItems }) {
  return generateEmailHtml({
    subject: 'You were mentioned in a comment',
    greeting: `Hi ${recipientName || 'there'},`,
    introHtml: `<strong>${mentionerName}</strong> mentioned you in a comment on the task <strong>${taskTitle}</strong>.`,
    conversationItems: conversationItems || [],
    ctaUrl: taskUrl,
    ctaLabel: 'View Task & Reply',
  });
}