import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../actions";
import { selectAuthLoading, selectAuthError } from "../selectors";
import "../../../shared/styles/auth.css";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await dispatch(
      registerUser({ login, password, passwordConfirm, fullName, email })
    );
    if (ok) {
      navigate("/verify-email", { state: { email } });
    }
  };

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="grid grid--2">
        <div className="field">
          <label className="label" htmlFor="fullName">
            Full name *
          </label>
          <input
            id="fullName"
            className="input"
            type="text"
            placeholder="John Carter"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="login">
            Login *
          </label>
          <input
            id="login"
            className="input"
            type="text"
            placeholder="jcarter"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="email">
          E-mail *
        </label>
        <input
          id="email"
          className="input"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="grid grid--2">
        <div className="field">
          <label className="label" htmlFor="password">
            Password *
          </label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="Enter a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="passwordConfirm">
            Confirm password *
          </label>
          <input
            id="passwordConfirm"
            className="input"
            type="password"
            placeholder="Repeat your password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      {error && (
        <div className="error" style={{ color: "#b91c1c" }}>
          {String(error)}
        </div>
      )}

      <button className="btn btn--primary" type="submit" disabled={loading}>
        {loading ? "..." : "Create account"}
      </button>

      <div className="altLink">
        Already have an account?{" "}
        <a href="/login" className="link">
          Sign In →
        </a>
      </div>
    </form>
  );
}
