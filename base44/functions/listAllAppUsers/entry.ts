import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

// Simple in-memory cache to avoid repeated API hammering
const usersCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60_000; // 1 minute

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    if (usersCache.data && (now - usersCache.fetchedAt) < CACHE_TTL_MS) {
      return Response.json({ users: usersCache.data });
    }

    const users = await base44.asServiceRole.entities.User.list();
    usersCache.data = users;
    usersCache.fetchedAt = now;

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});