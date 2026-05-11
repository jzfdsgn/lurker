import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listUsers,
  findUserById,
  deleteUser,
  countAdmins,
} from '../db/users.js';
import {
  createInvite,
  listInvites,
  deleteInvite,
  getInvite,
} from '../db/invites.js';

const router = Router();
router.use(requireAuth, requireAdmin);

function deriveInviteStatus(row) {
  if (row.usedByUserId != null) return 'consumed';
  if (row.expiresAt && Date.parse(row.expiresAt) < Date.now()) return 'expired';
  return 'pending';
}

function publicInvite(row, { origin }) {
  return {
    token: row.token,
    url: `${origin}/invite/${row.token}`,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    usedByUsername: row.usedByUsername || null,
    createdByUsername: row.createdByUsername || null,
    status: deriveInviteStatus(row),
  };
}

// Use the originating request's host so the generated invite URL works
// regardless of which hostname the admin happens to be using (dev hosts,
// reverse proxy alias, etc.).
function originFromRequest(req) {
  const proto = req.protocol;
  const host = req.get('host');
  return `${proto}://${host}`;
}

router.get('/users', (req, res) => {
  res.json({
    users: listUsers().map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.created_at,
    })),
  });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  const target = findUserById(id);
  if (!target) return res.status(404).json({ error: 'not found' });
  if (target.id === req.user.id) {
    return res.status(409).json({ error: 'cannot delete yourself' });
  }
  // Last-admin guard. Refusing to delete the only admin mirrors the
  // last-passkey behaviour — irreversible loss of control.
  if (target.role === 'admin' && countAdmins() <= 1) {
    return res.status(409).json({ error: 'cannot delete the only admin' });
  }
  deleteUser(id);
  res.json({ ok: true });
});

router.get('/invites', (req, res) => {
  const origin = originFromRequest(req);
  res.json({ invites: listInvites().map((r) => publicInvite(r, { origin })) });
});

router.post('/invites', (req, res) => {
  const requested = Number(req.body?.expiresInDays);
  const expiresInDays = Number.isFinite(requested) && requested > 0 ? requested : 7;
  const row = createInvite(req.user.id, { expiresInDays });
  const full = listInvites().find((r) => r.token === row.token);
  const origin = originFromRequest(req);
  res.json({ invite: publicInvite(full || row, { origin }) });
});

router.delete('/invites/:token', (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(400).json({ error: 'missing token' });
  // Refuse to delete consumed invites — they're audit history (which user
  // joined via which admin's invitation). Pending/expired are fair game.
  const existing = getInvite(token);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.usedByUserId != null) {
    return res.status(409).json({ error: 'cannot delete a consumed invite' });
  }
  deleteInvite(token);
  res.json({ ok: true });
});

export default router;
