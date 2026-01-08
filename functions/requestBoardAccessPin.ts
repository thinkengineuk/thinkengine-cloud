import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container { 
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 24px;
      text-align: center;
    }
    .header h1 { 
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content { 
      padding: 40px 32px;
    }
    .pin-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin: 32px 0;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }
    .pin-code {
      font-size: 48px;
      font-weight: 700;
      color: white;
      letter-spacing: 8px;
      margin: 0;
      font-family: 'Courier New', monospace;
    }
    .pin-label {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin-top: 12px;
      font-weight: 500;
    }
    .info-text {
      color: #4a5568;
      font-size: 16px;
      line-height: 1.6;
      margin: 16px 0;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .warning-text {
      color: #856404;
      font-size: 14px;
      margin: 0;
    }
    .footer {
      text-align: center;
      padding: 24px;
      color: #718096;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .detail-item {
      background: #f7fafc;
      padding: 12px 16px;
      margin: 8px 0;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .detail-label {
      color: #718096;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      color: #2d3748;
      font-size: 16px;
      margin-top: 4px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Board Access Request</h1>
    </div>
    <div class="content">
      <p class="info-text">
        <strong>Access Request Alert</strong><br/>
        Someone has requested access to the secure board. Here are the details:
      </p>
      
      <div class="detail-item">
        <div class="detail-label">Requested By</div>
        <div class="detail-value">${user.full_name} (${user.email})</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">Board</div>
        <div class="detail-value">Ben's Tasks</div>
      </div>
      
      <div class="detail-item">
        <div class="detail-label">Time</div>
        <div class="detail-value">${new Date().toLocaleString('en-GB', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}</div>
      </div>

      <div class="pin-box">
        <div class="pin-label">YOUR ACCESS CODE</div>
        <p class="pin-code">${pinCode}</p>
        <div class="pin-label">Valid for 10 minutes</div>
      </div>

      <div class="warning">
        <p class="warning-text">
          ⚠️ <strong>Security Notice:</strong> This code expires in 10 minutes and can only be used once. 
          If you did not request this access, please disregard this email.
        </p>
      </div>

      <p class="info-text">
        Enter this code on the access screen to view the board content.
      </p>
    </div>
    <div class="footer">
      TaskFlow Security System • Automated Message
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'ben@thinkengine.co',
      subject: '🔐 Board Access Code Request',
      body: emailHtml
    });

    return Response.json({ 
      success: true,
      message: 'Access code sent to ben@thinkengine.co',
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