import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, watcherName, assignerName, taskTitle, boardName, taskUrl } = await req.json();

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>You're now watching a task</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">TASKFLOW</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">You're now watching a task</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 12px 0;">Hi ${watcherName},</p>
            <div style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:20px;">
              <strong>${assignerName}</strong> added you as a watcher to the task <strong>${taskTitle}</strong> in the <strong>${boardName}</strong> project.<br/><br/>You'll receive updates whenever this task is modified or commented on.
            </div>
            <div style="text-align:center;margin:28px 0 8px 0;">
              <a href="${taskUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View Task &amp; Reply &#8594;</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
            <div style="font-size:12px;color:#94a3b8;">TaskFlow Task Management &middot; Automated Message</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: `You're now watching "${taskTitle}"`,
      body: htmlBody,
    });

    return Response.json({ message: `Test watcher email sent to ${to}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});