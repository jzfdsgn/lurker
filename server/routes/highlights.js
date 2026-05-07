import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listMentionsForUser } from '../db/messages.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
  const before = req.query.before ? Number(req.query.before) : undefined;
  const events = listMentionsForUser(req.user.id, { before, limit });
  res.json({
    events,
    hasMore: events.length === limit,
  });
});

export default router;
