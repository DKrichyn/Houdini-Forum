import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import postsRoutes from './posts.routes.js';
import commentsRoutes from './comments.routes.js';
import categoriesRoutes from './categories.routes.js';
import adminRoutes from './admin.routes.js'; 


export function registerRoutes(app) {

  app.use('/api/auth', authRoutes);

  app.use('/api/users', usersRoutes);

  app.use('/api/posts', postsRoutes);

  app.use('/api/comments', commentsRoutes);

  app.use('/api/categories', categoriesRoutes);

  app.use('/api/admin', adminRoutes);

}
