import { pool } from '../storage/db.js';

export async function recomputeUserRating(userId) {
  const [[{ scorePosts = 0 }]] = await pool.query(
    `
    SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END),0) AS scorePosts
    FROM Likes l
    JOIN Posts p ON l.target_type='post' AND l.target_id=p.id
    WHERE p.author_id = ?
    `,
    [userId]
  );

  const [[{ scoreComments = 0 }]] = await pool.query(
    `
    SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END),0) AS scoreComments
    FROM Likes l
    JOIN Comments c ON l.target_type='comment' AND l.target_id=c.id
    WHERE c.author_id = ?
    `,
    [userId]
  );

  const score = Number(scorePosts) + Number(scoreComments);

  await pool.query(`UPDATE Users SET rating=? WHERE id=?`, [score, userId]);
}
