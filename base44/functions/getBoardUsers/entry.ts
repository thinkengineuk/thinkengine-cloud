import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory cache to avoid hammering the API on repeated calls
const usersCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60_000; // 1 minute

async function getAllUsersCached(base44) {
  const now = Date.now();
  if (usersCache.data && (now - usersCache.fetchedAt) < CACHE_TTL_MS) {
    return usersCache.data;
  }
  const users = await base44.asServiceRole.entities.User.list();
  usersCache.data = users;
  usersCache.fetchedAt = now;
  return users;
}

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

    // Use cached user list to avoid repeated API calls
    const allUsers = await getAllUsersCached(base44);
    const boardUsers = allUsers.filter(u => memberEmails.includes(u.email));

    return Response.json({ users: boardUsers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});