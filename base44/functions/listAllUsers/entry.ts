import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allUsers = await base44.asServiceRole.entities.User.list();
        return Response.json({ users: allUsers });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});