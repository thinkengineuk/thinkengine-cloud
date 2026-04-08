import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

  await base44.auth.updateMe({ profile_picture_url: file_url });

  return Response.json({ profile_picture_url: file_url });
});