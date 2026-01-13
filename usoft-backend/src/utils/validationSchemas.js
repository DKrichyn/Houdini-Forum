import Joi from 'joi';

export const registerSchema = Joi.object({
  login: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  passwordConfirm: Joi.ref('password'),
  fullName: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required()
});

export const loginSchema = Joi.object({
  login: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const passwordResetStartSchema = Joi.object({
  email: Joi.string().email().required()
});

export const passwordResetConfirmSchema = Joi.object({
  password: Joi.string().min(6).max(100).required()
});

export const userCreateSchema = Joi.object({
  login: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  passwordConfirm: Joi.ref('password'),
  fullName: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('user', 'admin').required()
});

export const userUpdateSchema = Joi.object({
  fullName: Joi.string().min(3).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('user', 'admin')
});

export const postsListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('likes', 'date').default('likes'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  categories: Joi.alternatives(
    Joi.array().items(Joi.number().integer().positive()),
    Joi.string()
  ),
  from: Joi.date(),
  to: Joi.date(),
  status: Joi.string().valid('active', 'inactive', 'all').default('active'),
  favorite: Joi.boolean() 
}).unknown(true);

export const postCreateSchema = Joi.object({
  title: Joi.string().min(3).required(),
  content: Joi.string().min(3).required(),
  categories: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

export const postUpdateSchema = Joi.object({
  title: Joi.string().min(3),
  content: Joi.string().min(3),
  categories: Joi.array().items(Joi.number().integer().positive()),
  status: Joi.string().valid('active', 'inactive')
});

export const categoryCreateSchema = Joi.object({
  title: Joi.string().min(2).required(),
  description: Joi.string().allow('', null)
});

export const categoryUpdateSchema = Joi.object({
  title: Joi.string().min(2),
  description: Joi.string().allow('', null)
});

export const commentCreateSchema = Joi.object({
  postId: Joi.number().integer().positive().required(),
  content: Joi.string().min(1).required()
});

export const commentUpdateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required()
});

export const likeBodySchema = Joi.object({
  type: Joi.string().valid('like', 'dislike').default('like')
});
