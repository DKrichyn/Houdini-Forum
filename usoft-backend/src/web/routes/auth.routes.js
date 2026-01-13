import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  passwordResetStartSchema,
  passwordResetConfirmSchema
} from '../../utils/validationSchemas.js';
import {
  register, login, logout, confirmEmail,
  startPasswordReset, confirmPasswordReset
} from '../../services/authService.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { login: loginName, password, fullName, email } = req.body;
    const user = await register({ login: loginName, password, fullName, email });
    res.status(201).json({ id: user.id, login: loginName, email });
  } catch (e) { next(e); }
});
router.get('/auth/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = await confirmEmail(token);

    const url = new URL('/login', config.frontendUrl);
    url.searchParams.set('verified', '1');
    if (email) url.searchParams.set('email', email);

    return res.redirect(302, url.toString());
  } catch (e) {
    const url = new URL('/login', config.frontendUrl);
    url.searchParams.set('verified', '0');
    url.searchParams.set('reason', encodeURIComponent(e.message || 'Invalid token'));
    return res.redirect(302, url.toString());
  }
});
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const token = await login(req.body);
    res.json({ token });
  } catch (e) { next(e); }
});

router.get('/confirm/:token', async (req, res, next) => {
  try {
    await confirmEmail(req.params.token);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/logout', async (_req, res, next) => {
  try {
    await logout();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/password-reset', validate(passwordResetStartSchema), async (req, res, next) => {
  try {
    await startPasswordReset(req.body.email);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/password-reset/:token', validate(passwordResetConfirmSchema), async (req, res, next) => {
  try {
    await confirmPasswordReset(req.params.token, req.body.password);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
