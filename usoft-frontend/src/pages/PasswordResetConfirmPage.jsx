import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "../features/auth/api";

export default function PasswordResetConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!password || password.length < 6) {
      setErr("Minimum password length is 6 characters.");
      return;
    }
    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }
    try {
      setBusy(true);
      await confirmPasswordReset(token, password);
      setOk(true);
    } catch (e2) {
      setErr(
        e2?.message ||
          "Failed to reset password. The link may have expired."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "40px auto",
        padding: "0 16px",
        color: "#e7ecf3",
      }}
    >
      <div
        style={{
          background: "#171a22",
          border: "1px solid #2a3040",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h1 style={{ margin: "0 0 10px" }}>Password Reset</h1>

        {ok ? (
          <div>
            <p>
              Your password has been successfully changed. You can now log in with the new one.
            </p>
            <div style={{ marginTop: 12 }}>
              <Link
                to="/login"
                style={{ textDecoration: "underline", color: "#93c5fd" }}
              >
                Go to login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            {err && <div style={{ color: "#ffb4b4", fontSize: 14 }}>{err}</div>}
            <label style={{ display: "grid", gap: 6 }}>
              <span>New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #2a3040",
                  background: "#0f131c",
                  color: "#e7ecf3",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Repeat password</span>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Repeat password"
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #2a3040",
                  background: "#0f131c",
                  color: "#e7ecf3",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #2a3040",
                background: "#0f131c",
                color: "#e7ecf3",
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Confirm new password"
            >
              {busy ? "Saving…" : "Change password"}
            </button>

            <div style={{ marginTop: 8 }}>
              <Link
                to="/"
                style={{ textDecoration: "underline", color: "#93c5fd" }}
              >
                Back to home
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
