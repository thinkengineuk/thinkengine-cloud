import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await req.json();

    if (!boardId) {
      return Response.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Rate limiting: Check if user has requested a pin in the last 2 minutes
    const recentPins = await base44.asServiceRole.entities.TwoFactorPin.filter({
      board_id: boardId,
      user_email: user.email
    });

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentPin = recentPins.find(pin => 
      new Date(pin.created_date) > twoMinutesAgo && !pin.used
    );

    if (recentPin) {
      return Response.json({ 
        error: 'Please wait 2 minutes before requesting a new code',
        retryAfter: 120
      }, { status: 429 });
    }

    // Generate random 6-digit pin
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save pin to database
    await base44.asServiceRole.entities.TwoFactorPin.create({
      board_id: boardId,
      pin_code: pinCode,
      user_email: user.email,
      expires_at: expiresAt,
      used: false
    });

    // Send email with pin to ben@thinkengine.co
    const digits = pinCode.split('');
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.7);">THINKENGINE CLOUD</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#ffffff;">Board Access Code</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">

              <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi ${user.full_name},</p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Here is your one-time access code for the secure board. Enter it on the access screen within 10 minutes.</p>

              <!-- PIN display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;">Your Access Code</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        ${digits.map(d => `
                        <td style="padding:0 4px;">
                          <div style="width:52px;height:64px;background:#f8faff;border:2px solid #2563eb;border-radius:12px;text-align:center;line-height:64px;font-size:36px;font-weight:800;color:#1e3a5f;font-family:'Courier New',monospace;">${d}</div>
                        </td>`).join('')}
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">⏱ Expires in <strong>10 minutes</strong> &nbsp;•&nbsp; Single use only</p>
                    <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Or copy the full code: <strong style="font-family:'Courier New',monospace;letter-spacing:2px;color:#1e3a5f;">${pinCode}</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Requested by</span>
                    <p style="margin:2px 0 0;font-size:14px;color:#1f2937;font-weight:500;">${user.full_name} &nbsp;<span style="color:#6b7280;font-weight:400;">(${user.email})</span></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Time</span>
                    <p style="margin:2px 0 0;font-size:14px;color:#1f2937;font-weight:500;">${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</p>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
                <tr>
                  <td style="font-size:13px;color:#92400e;line-height:1.5;">
                    <strong>⚠️ Security Notice:</strong> If you did not request this code, please ignore this email. Do not share this code with anyone.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">ThinkEngine Cloud Security System &nbsp;•&nbsp; Automated Message</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: '🔐 Board Access Code Request',
      body: emailHtml
    });

    return Response.json({ 
    success: true,
    message: `Access code sent to ${user.email}`,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error) {
    console.error('Error requesting board access pin:', error);
    return Response.json({ 
      error: 'Failed to send access code',
      details: error.message 
    }, { status: 500 });
  }
});