
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export function ownerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    const ownerId = await getOwnerId(req);
    if (req.user.role === 'admin' || req.user.id === ownerId) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
