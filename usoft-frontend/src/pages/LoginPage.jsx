import React from "react";
import { useSelector } from "react-redux";
import { selectIsAuthed } from "../features/auth/selectors";
import { Navigate } from "react-router-dom";
import LoginForm from "../features/auth/ui/LoginForm";
import "../shared/styles/auth.css";

export default function LoginPage() {
  const isAuthed = useSelector(selectIsAuthed);
  
  if (isAuthed) return <Navigate to="/" replace />;

  return (
    <div className="auth">
      <aside className="auth__side auth__side--promo">
        <div className="promo-overlay" />
      </aside>

      <main className="auth__side auth__side--form">
        <div className="auth__panel">
          <div className="auth__panelHeader">
            <h2>
              Sign <span className="accent">In</span>
            </h2>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
