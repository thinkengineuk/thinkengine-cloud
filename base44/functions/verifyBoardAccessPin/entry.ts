import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId, pinCode } = await req.json();

    if (!boardId || !pinCode) {
      return Response.json({ 
        error: 'Board ID and pin code are required' 
      }, { status: 400 });
    }

    // Find matching pin
    const pins = await base44.asServiceRole.entities.TwoFactorPin.filter({
      board_id: boardId,
      pin_code: pinCode,
      user_email: user.email,
      used: false
    });

    if (pins.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Invalid access code'
      }, { status: 400 });
    }

    const pin = pins[0];

    // Check if pin has expired
    const now = new Date();
    const expiresAt = new Date(pin.expires_at);

    if (now > expiresAt) {
      // Mark as used to prevent reuse
      await base44.asServiceRole.entities.TwoFactorPin.update(pin.id, {
        used: true
      });

      return Response.json({ 
        success: false,
        error: 'Access code has expired. Please request a new one.'
      }, { status: 400 });
    }

    // Mark pin as used
    await base44.asServiceRole.entities.TwoFactorPin.update(pin.id, {
      used: true
    });

    // Clean up old pins for this board and user (older than 1 hour)
    const allPins = await base44.asServiceRole.entities.TwoFactorPin.filter({
      board_id: boardId,
      user_email: user.email
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const oldPin of allPins) {
      if (new Date(oldPin.created_date) < oneHourAgo) {
        try {
          await base44.asServiceRole.entities.TwoFactorPin.delete(oldPin.id);
        } catch (error) {
          console.warn('Failed to delete old pin:', error);
        }
      }
    }

    // Log board access in activity log
    await base44.asServiceRole.entities.ActivityLog.create({
      task_id: boardId, // reuse task_id field to store board context
      action_type: 'updated',
      action_description: `${user.full_name} verified board access via 2FA`,
      user_email: user.email,
      metadata: { type: 'board_access', board_id: boardId }
    });

    return Response.json({ 
      success: true,
      message: 'Access granted'
    });

  } catch (error) {
    console.error('Error verifying board access pin:', error);
    return Response.json({ 
      error: 'Failed to verify access code',
      details: error.message 
    }, { status: 500 });
  }
});