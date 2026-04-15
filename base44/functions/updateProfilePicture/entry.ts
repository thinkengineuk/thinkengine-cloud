import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_picture_url } = await req.json();
  if (!profile_picture_url) return Response.json({ error: 'No URL provided' }, { status: 400 });

  await base44.auth.updateMe({ profile_picture_url });

  return Response.json({ profile_picture_url });
});