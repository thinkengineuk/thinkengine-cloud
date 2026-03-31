import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { boardId } = body;

        if (!boardId) {
            return Response.json({ error: 'boardId is required' }, { status: 400 });
        }

        // Get the board to find its members
        const boards = await base44.asServiceRole.entities.Board.filter({ id: boardId });
        if (boards.length === 0) {
            return Response.json({ error: 'Board not found' }, { status: 404 });
        }

        const board = boards[0];
        const memberEmails = board.members || [];

        // Fetch all users using service role, then filter to board members
        const allUsers = await base44.asServiceRole.entities.User.list();
        const boardUsers = allUsers.filter(u => memberEmails.includes(u.email));

        return Response.json({ users: boardUsers });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});