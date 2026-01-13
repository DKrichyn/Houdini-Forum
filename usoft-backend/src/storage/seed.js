import { pool } from './db.js';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

export async function seed() {
  console.log('Seeding...');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of [
      'Favorites','Likes','Comments','PostCategories','Posts','Categories','EmailTokens','PasswordResetTokens','Users'
    ]) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const passwordHash = await bcrypt.hash('password', 10);

    const users = [
      ['admin','Admin','admin@example.com','admin'],
      ['alice','Alice Johnson','alice@example.com','user'],
      ['bob','Bob Brown','bob@example.com','user'],
      ['carol','Carol Lee','carol@example.com','user'],
      ['dave','Dave Kim','dave@example.com','user'],
      ['erin','Erin Chen','erin@example.com','user']
    ];
    const userMap = {};
    for (const [login, fullName, email, role] of users) {
      const [r] = await conn.query(
        `INSERT INTO Users (login, password_hash, full_name, email, email_confirmed, role)
         VALUES (?,?,?,?,1,?)`,
        [login, passwordHash, fullName, email, role]
      );
      userMap[login] = r.insertId;
    }

    const catTitles = [
      ['News','General updates'],
      ['Tech','Technology'],
      ['Lifestyle','Life & work'],
      ['Databases','SQL & NoSQL'],
      ['Algorithms','Data structures & algorithms'],
      ['JavaScript','JS and ecosystem']
    ];
    const catMap = {};
    for (const [title, description] of catTitles) {
      const [r] = await conn.query(
        `INSERT INTO Categories (title, description, slug) VALUES (?,?,?)`,
        [title, description, slugify(title, { lower: true, strict: true })]
      );
      catMap[title] = r.insertId;
    }

    const posts = [
      ['Hello USOF','First post body','active','admin',['News','Tech']],
      ['Index design in MySQL','How to design indexes','active','alice',['Databases','Algorithms']],
      ['Async patterns in JS','Callbacks vs Promises vs Async/Await','active','bob',['JavaScript','Tech']],
      ['Binary search pitfalls','Edge cases & overflows','active','carol',['Algorithms']],
      ['Normalization levels','1NF … 3NF and beyond','active','dave',['Databases']],
      ['Work-life balance','Tips & routines','inactive','erin',['Lifestyle']]
    ];
    const postMap = {};
    for (const [title, content, status, authorLogin, cats] of posts) {
      const [r] = await conn.query(
        `INSERT INTO Posts (title, content, status, author_id) VALUES (?,?,?,?)`,
        [title, content, status, userMap[authorLogin]]
      );
      postMap[title] = r.insertId;
      for (const ct of cats) {
        await conn.query(
          `INSERT INTO PostCategories (post_id, category_id) VALUES (?,?)`,
          [r.insertId, catMap[ct]]
        );
      }
    }

    const comments = [
      [postMap['Hello USOF'], userMap['bob'], 'Nice start!'],
      [postMap['Hello USOF'], userMap['alice'], 'Welcome to the platform'],
      [postMap['Index design in MySQL'], userMap['dave'], 'Use EXPLAIN to check plans'],
      [postMap['Async patterns in JS'], userMap['carol'], 'Async/await is cleaner'],
      [postMap['Binary search pitfalls'], userMap['erin'], 'Watch off-by-one issues'],
      [postMap['Normalization levels'], userMap['alice'], '3NF is usually enough'],
      [postMap['Async patterns in JS'], userMap['admin'], 'Don’t forget error handling']
    ];
    const commentIds = [];
    for (const [postId, authorId, content] of comments) {
      const [r] = await conn.query(
        `INSERT INTO Comments (post_id, author_id, content, status) VALUES (?,?,?,'active')`,
        [postId, authorId, content]
      );
      commentIds.push(r.insertId);
    }

    const likes = [

      [userMap['alice'], 'post', postMap['Hello USOF'], 'like'],
      [userMap['bob'], 'post', postMap['Hello USOF'], 'like'],
      [userMap['carol'], 'post', postMap['Index design in MySQL'], 'like'],
      [userMap['dave'], 'post', postMap['Async patterns in JS'], 'dislike'],
      [userMap['erin'], 'post', postMap['Async patterns in JS'], 'like'],
      [userMap['admin'], 'post', postMap['Binary search pitfalls'], 'like'],
      [userMap['alice'], 'post', postMap['Normalization levels'], 'like'],
      [userMap['bob'], 'post', postMap['Work-life balance'], 'dislike'],

      [userMap['admin'], 'comment', commentIds[0], 'like'],
      [userMap['dave'], 'comment', commentIds[1], 'like'],
      [userMap['erin'], 'comment', commentIds[2], 'dislike'],
      [userMap['alice'], 'comment', commentIds[3], 'like'],
      [userMap['carol'], 'comment', commentIds[4], 'like'],
      [userMap['bob'], 'comment', commentIds[5], 'like']
    ];
    for (const [authorId, targetType, targetId, type] of likes) {
      await conn.query(
        `INSERT INTO Likes (author_id, target_type, target_id, type) VALUES (?,?,?,?)`,
        [authorId, targetType, targetId, type]
      );
    }

    const favorites = [
      [userMap['alice'], postMap['Hello USOF']],
      [userMap['alice'], postMap['Index design in MySQL']],
      [userMap['bob'],   postMap['Binary search pitfalls']],
      [userMap['carol'], postMap['Async patterns in JS']],
      [userMap['dave'],  postMap['Normalization levels']]
    ];
    for (const [userId, postId] of favorites) {
      await conn.query(
        `INSERT INTO Favorites (user_id, post_id) VALUES (?,?)`,
        [userId, postId]
      );
    }

    const [postIds] = await conn.query(`SELECT id FROM Posts`);
    for (const { id } of postIds) {
      const [[{ lc = 0 }]] = await conn.query(
        `SELECT COUNT(*) AS lc FROM Likes WHERE target_type='post' AND target_id=? AND type='like'`, [id]
      );
      const [[{ dc = 0 }]] = await conn.query(
        `SELECT COUNT(*) AS dc FROM Likes WHERE target_type='post' AND target_id=? AND type='dislike'`, [id]
      );
      await conn.query(
        `UPDATE Posts SET likes_count=?, dislikes_count=? WHERE id=?`, [lc, dc, id]
      );
    }

    const [comIds] = await conn.query(`SELECT id FROM Comments`);
    for (const { id } of comIds) {
      const [[{ lc = 0 }]] = await conn.query(
        `SELECT COUNT(*) AS lc FROM Likes WHERE target_type='comment' AND target_id=? AND type='like'`, [id]
      );
      const [[{ dc = 0 }]] = await conn.query(
        `SELECT COUNT(*) AS dc FROM Likes WHERE target_type='comment' AND target_id=? AND type='dislike'`, [id]
      );
      await conn.query(
        `UPDATE Comments SET likes_count=?, dislikes_count=? WHERE id=?`, [lc, dc, id]
      );
    }

    const [usersAll] = await conn.query(`SELECT id FROM Users`);
    for (const { id } of usersAll) {
      const [[{ score = 0 }]] = await conn.query(
        `
        SELECT
          COALESCE((
            SELECT SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END)
            FROM Likes l
            JOIN Posts p ON l.target_type='post' AND l.target_id=p.id
            WHERE p.author_id = ?
          ),0)
          +
          COALESCE((
            SELECT SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END)
            FROM Likes l
            JOIN Comments c ON l.target_type='comment' AND l.target_id=c.id
            WHERE c.author_id = ?
          ),0)
          AS score
        `,
        [id, id]
      );
      await conn.query(`UPDATE Users SET rating=? WHERE id=?`, [score || 0, id]);
    }

    await conn.commit();
    console.log('Seed done.');
  } catch (e) {
    await conn.rollback();
    console.error('Seed failed:', e);
    throw e;
  } finally {
    conn.release();
  }
}
