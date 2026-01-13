import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { confirmPasswordResetApi } from "../features/auth/api";

export default function PasswordResetPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!pass1.trim() || !pass2.trim()) {
      setErr("Enter both fields");
      return;
    }
    if (pass1 !== pass2) {
      setErr("Passwords do not match");
      return;
    }
    try {
      setBusy(true);
      setErr(null);
      await confirmPasswordResetApi({ token, password: pass1 });
      setOk(true);
    } catch (e2) {
      setErr(e2?.message || "Failed to set new password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "32px auto",
        padding: "0 16px",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          background: "#171a22",
          border: "1px solid #2a3040",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 28px rgba(0,0,0,.35)",
        }}
      >
        <h1
          style={{ margin: 0, marginBottom: 10, fontSize: 24, fontWeight: 800 }}
        >
          Set a new password
        </h1>

        {ok ? (
          <>
            <p style={{ marginTop: 8 }}>
              Your password has been updated successfully.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <Link className="btn btn--primary" to="/login">
                Go to Login
              </Link>
              <button
                className="btn btn--secondary"
                onClick={() => navigate("/")}
              >
                Home
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="modalForm">
            <div className="modalRow">
              <label className="modalLabel" htmlFor="np1">
                New password
              </label>
              <input
                id="np1"
                className="modalInput"
                type="password"
                autoComplete="new-password"
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
              />
            </div>
            <div className="modalRow">
              <label className="modalLabel" htmlFor="np2">
                Confirm new password
              </label>
              <input
                id="np2"
                className="modalInput"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
              />
            </div>

            {err && (
              <div
                role="alert"
                style={{ color: "#fda4af", fontSize: 13, marginTop: 6 }}
              >
                ⚠ {String(err)}
              </div>
            )}

            <div className="modalActions" style={{ marginTop: 12 }}>
              <Link className="btn btn-secondary" to="/">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
