import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { pool } from '../../storage/db.js';
import { validate } from '../middlewares/validate.js';
import { commentCreateSchema, commentUpdateStatusSchema, likeBodySchema } from '../../utils/validationSchemas.js';
import { recomputeUserRating } from '../../services/ratingService.js';

const router = Router();

router.post('/', auth(true), validate(commentCreateSchema), async (req, res, next) => {
  try {
    const { postId, content } = req.body;
    const [[post]] = await pool.query(`SELECT id, status, author_id AS authorId FROM Posts WHERE id=?`, [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'active') return res.status(403).json({ error: 'Cannot comment inactive post' });

    const [r] = await pool.query(
      `INSERT INTO Comments (post_id, author_id, content, status) VALUES (?,?,?,'active')`,
      [postId, req.user.id, content]
    );
    const [[c]] = await pool.query(
      `SELECT id, post_id AS postId, author_id AS authorId, content, status,
              likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Comments WHERE id=?`, [r.insertId]
    );
    res.status(201).json(c);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[c]] = await pool.query(
      `SELECT id, post_id AS postId, author_id AS authorId, content, status,
              likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Comments WHERE id=?`,
      [req.params.id]
    );
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    res.json(c);
  } catch (e) { next(e); }
});

router.patch('/:id', auth(true), validate(commentUpdateStatusSchema), async (req, res, next) => {
  try {
    const [[c]] = await pool.query(`SELECT id FROM Comments WHERE id=?`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    await pool.query(`UPDATE Comments SET status=? WHERE id=?`, [req.body.status, req.params.id]);
    const [[out]] = await pool.query(
      `SELECT id, post_id AS postId, author_id AS authorId, content, status,
              likes_count AS likesCount, dislikes_count AS dislikesCount,
              created_at AS createdAt, updated_at AS updatedAt
       FROM Comments WHERE id=?`,
      [req.params.id]
    );
    res.json(out);
  } catch (e) { next(e); }
});

router.delete('/:id', auth(true), async (req, res, next) => {
  try {
    const [[c]] = await pool.query(
      `SELECT id, author_id AS authorId FROM Comments WHERE id=?`,
      [req.params.id]
    );
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    if (c.authorId !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query(`DELETE FROM Comments WHERE id=?`, [req.params.id]);
    res.status(204).send();
  } catch (e) { next(e); }
});

router.get('/:id/like', async (req, res, next) => {
  try {
    const [likes] = await pool.query(
      `SELECT id, author_id AS authorId, target_type AS targetType, target_id AS targetId, type,
              created_at AS createdAt
       FROM Likes WHERE target_type='comment' AND target_id=?`,
      [req.params.id]
    );
    res.json(likes);
  } catch (e) { next(e); }
});

router.post('/:id/like', auth(true), validate(likeBodySchema), async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    const [[existing]] = await pool.query(
      `SELECT id FROM Likes WHERE target_type='comment' AND target_id=? AND author_id=?`,
      [commentId, req.user.id]
    );
    if (existing) return res.status(409).json({ error: 'Already liked' });

    const [r] = await pool.query(
      `INSERT INTO Likes (author_id, target_type, target_id, type) VALUES (?,?,?,?)`,
      [req.user.id, 'comment', commentId, req.body.type || 'like']
    );

    const [[cnt]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='like' THEN 1 ELSE 0 END) AS lc,
         SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) AS dc
       FROM Likes WHERE target_type='comment' AND target_id=?`,
      [commentId]
    );
    await pool.query(
      `UPDATE Comments SET likes_count=?, dislikes_count=? WHERE id=?`,
      [cnt.lc || 0, cnt.dc || 0, commentId]
    );

    const [[c]] = await pool.query(`SELECT author_id AS authorId FROM Comments WHERE id=?`, [commentId]);
    if (c) await recomputeUserRating(c.authorId);

    const [[out]] = await pool.query(
      `SELECT id, author_id AS authorId, target_type AS targetType, target_id AS targetId, type,
              created_at AS createdAt
       FROM Likes WHERE id=?`, [r.insertId]
    );
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.delete('/:id/like', auth(true), async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    const [[like]] = await pool.query(
      `SELECT id FROM Likes WHERE target_type='comment' AND target_id=? AND author_id=?`,
      [commentId, req.user.id]
    );
    if (!like) return res.status(404).json({ error: 'Like not found' });

    await pool.query(`DELETE FROM Likes WHERE id=?`, [like.id]);

    const [[cnt]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='like' THEN 1 ELSE 0 END) AS lc,
         SUM(CASE WHEN type='dislike' THEN 1 ELSE 0 END) AS dc
       FROM Likes WHERE target_type='comment' AND target_id=?`,
      [commentId]
    );
    await pool.query(
      `UPDATE Comments SET likes_count=?, dislikes_count=? WHERE id=?`,
      [cnt.lc || 0, cnt.dc || 0, commentId]
    );

    const [[c]] = await pool.query(`SELECT author_id AS authorId FROM Comments WHERE id=?`, [commentId]);
    if (c) await recomputeUserRating(c.authorId);

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
