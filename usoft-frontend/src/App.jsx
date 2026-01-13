// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import Header from "./app/layout/Header";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import PostDetailsPage from "./pages/PostDetailsPage";
import CreatePostPage from "./pages/CreatePostPage";
import EditPostPage from "./pages/EditPostPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import EmailConfirmLanding from "./pages/EmailConfirmLanding"; // ⬅ ДОДАНО
import { restoreSession } from "./features/auth/actions";
import { TitleSnakeGame } from "./features/title-snake/TitleSnakeGame";

export default function App() {
  const dispatch = useDispatch();
  const [isSnakeActive, setIsSnakeActive] = useState(false);
  const reactTitle = useRef(document.title);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!isSnakeActive) {
        reactTitle.current = document.title;
      }
    });
    observer.observe(document.querySelector("title"), { childList: true });
    return () => observer.disconnect();
  }, [isSnakeActive]);

  useEffect(() => {
    const handleHotKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setIsSnakeActive((prev) => {
          const nextState = !prev;
          if (nextState === false) document.title = reactTitle.current;
          return nextState;
        });
      }
    };
    window.addEventListener("keydown", handleHotKey);
    return () => window.removeEventListener("keydown", handleHotKey);
  }, []);

  const handleGameOver = (score) => {
    setIsSnakeActive(false);
    document.title = `Game Over! (Score: ${score})`;
    setTimeout(() => {
      if (!isSnakeActive) document.title = reactTitle.current;
    }, 2000);
  };

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <div className="app">
      {isSnakeActive && <TitleSnakeGame onGameOver={handleGameOver} />}

      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Потрібна сторінка підтвердження email */}
          <Route path="/email-confirm" element={<EmailConfirmLanding />} /> {/* ⬅ ДОДАНО */}

          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset/:token" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/posts/new" element={<CreatePostPage />} />
          <Route path="/posts/:id/edit" element={<EditPostPage />} />
          <Route path="/posts/:id" element={<PostDetailsPage />} />
          <Route path="/post/:id" element={<PostDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
