import jwt from 'jsonwebtoken';

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      if (required) return res.status(401).json({ error: 'Unauthorized' });
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const idNum = Number(payload?.id);
      const role = payload?.role;

      if (!role || Number.isNaN(idNum) || idNum <= 0) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      req.user = { id: idNum, role };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
