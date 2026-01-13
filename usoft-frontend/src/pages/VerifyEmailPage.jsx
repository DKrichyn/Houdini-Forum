import React from "react";
import "../shared/styles/auth.css";
import { useLocation, Link } from "react-router-dom";

export default function VerifyEmailPage() {
  const { state } = useLocation();
  const email = state?.email || "";

  return (
    <div className="auth">
      <aside className="auth__side auth__side--promo-reg">
        <div className="promo-overlay" />
      </aside>

      <main className="auth__side auth__side--form">
        <div className="auth__panel">
          <div className="auth__panelHeader">
            <h2>
              Email <span className="accent">verification</span>
            </h2>
          </div>

          <div
            className="form"
            style={{
              gap: 10,
              lineHeight: 1.55,
              color: "var(--text)",
              maxWidth: 460,
            }}
          >
            <p style={{ marginBottom: 6 }}>
              We’ve sent a confirmation link
              {email ? (
                <>
                  {" "}
                  to <strong>{email}</strong>
                </>
              ) : null}
              . Please open the email and follow the link to activate your
              account.
            </p>

            <ul
              style={{
                margin: "10px 0 4px 18px",
                padding: 0,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              <li>Didn’t get it? Check your spam folder.</li>
              <li>Still nothing? Request a new link from the login page.</li>
            </ul>

            <div style={{ marginTop: 12 }}>
              <Link
                to="/login"
                className="btn btn--primary"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  width: "fit-content",
                  padding: "12px 20px",
                  fontSize: 15,
                }}
              >
                Go to Sign In →
              </Link>
            </div>

            <div className="altLink" style={{ marginTop: 14 }}>
              Want to try again?{" "}
              <Link to="/register" className="link">
                Back to Sign Up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
