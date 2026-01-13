import bcrypt from 'bcryptjs';
export async function hashPassword(p) { const salt = await bcrypt.genSalt(10); return bcrypt.hash(p, salt); }
export async function verifyPassword(p, hash) { return bcrypt.compare(p, hash); }
