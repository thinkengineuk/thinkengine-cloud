import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, user_full_name } = await req.json();
    if (!userId || !user_full_name?.trim()) {
      return Response.json({ error: 'userId and user_full_name are required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, { user_full_name: user_full_name.trim() });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});