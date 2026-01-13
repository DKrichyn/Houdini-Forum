import { Router } from 'express';
import { auth, requireRole } from '../middlewares/auth.js';
import { pool } from '../../storage/db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories ORDER BY title ASC`
    );
    res.json(items);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[cat]] = await pool.query(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories WHERE id=?`,
      [req.params.id]
    );
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (e) { next(e); }
});

router.get('/:id/posts', async (req, res, next) => {
  try {
    const [[cat]] = await pool.query(`SELECT id FROM Categories WHERE id=?`, [req.params.id]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const [posts] = await pool.query(
      `
      SELECT p.id, p.title, p.status, p.likes_count AS likesCount, p.dislikes_count AS dislikesCount,
             p.created_at AS createdAt, p.updated_at AS updatedAt,
             u.id AS authorId, u.login AS authorLogin, u.full_name AS authorFullName
      FROM PostCategories pc
      JOIN Posts p ON p.id=pc.post_id
      JOIN Users u ON u.id=p.author_id
      WHERE pc.category_id=?
      ORDER BY p.created_at DESC
      `,
      [req.params.id]
    );
    res.json(posts);
  } catch (e) { next(e); }
});

router.post('/', auth(true), requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'Title required' });
    const slug = title.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [r] = await pool.query(
      `INSERT INTO Categories (title, description, slug) VALUES (?,?,?)`,
      [title, description ?? null, slug || null]
    );
    const [[cat]] = await pool.query(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories WHERE id=?`,
      [r.insertId]
    );
    res.status(201).json(cat);
  } catch (e) { next(e); }
});

router.patch('/:id', auth(true), requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description } = req.body ?? {};
    const [[cat]] = await pool.query(`SELECT id, title FROM Categories WHERE id=?`, [req.params.id]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    let slug = null;
    if (title !== undefined) {
      slug = title.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await pool.query(`UPDATE Categories SET title=?, slug=? WHERE id=?`, [title, slug || null, req.params.id]);
    }
    if (description !== undefined) {
      await pool.query(`UPDATE Categories SET description=? WHERE id=?`, [description, req.params.id]);
    }
    const [[out]] = await pool.query(
      `SELECT id, title, description, slug, created_at AS createdAt, updated_at AS updatedAt
       FROM Categories WHERE id=?`,
      [req.params.id]
    );
    res.json(out);
  } catch (e) { next(e); }
});

router.delete('/:id', auth(true), requireRole('admin'), async (req, res, next) => {
  try {
    const [r] = await pool.query(`DELETE FROM Categories WHERE id=?`, [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
