import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);

    const a = p1.trim(),
      b = p2.trim();
    if (!a || !b) return setErr("Enter the new password in both fields.");
    if (a.length < 6) return setErr("Password must be at least 6 characters.");
    if (a !== b) return setErr("Passwords do not match.");

    try {
      setBusy(true);
      const res = await fetch(
        `/api/auth/password-reset/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ password: a }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || `HTTP ${res.status}`);
      setDone(true);
    } catch (e2) {
      setErr(e2.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="resetpage">
        <div className="resetcard">
          <h1 className="reset__title">Password updated</h1>
          <p className="reset__text">
            You can now sign in with your new password.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => navigate("/login")}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resetpage">
      <div className="resetcard">
        <h1 className="reset__title">Set a new password</h1>
        <form className="reset__form" onSubmit={onSubmit}>
          <label className="reset__label">
            New password
            <input
              className="reset__input"
              type="password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          <label className="reset__label">
            Confirm new password
            <input
              className="reset__input"
              type="password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          {err && <div className="reset__error">⚠ {err}</div>}
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
