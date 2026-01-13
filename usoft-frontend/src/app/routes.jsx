// src/app/routes.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import PasswordResetConfirmPage from '../pages/PasswordResetConfirmPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import EmailConfirmLanding from '../pages/EmailConfirmLanding';
import ProfilePage from '../pages/ProfilePage';
import CreatePostPage from '../pages/CreatePostPage';
import EditPostPage from '../pages/EditPostPage';
import PostDetailsPage from '../pages/PostDetailsPage';
import AdminPage from '../pages/AdminPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/email-confirm" element={<EmailConfirmLanding />} />
      <Route path="/reset" element={<ResetPasswordPage />} />
      <Route path="/reset/:token" element={<PasswordResetConfirmPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/posts/new" element={<CreatePostPage />} />
      <Route path="/posts/:id/edit" element={<EditPostPage />} />
      <Route path="/posts/:id" element={<PostDetailsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
