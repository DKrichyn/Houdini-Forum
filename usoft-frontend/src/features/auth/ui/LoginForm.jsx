import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../actions";
import { selectAuthLoading, selectAuthError } from "../selectors";
import { useNavigate } from "react-router-dom";
import "../../../shared/styles/auth.css";

export default function LoginForm() {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await dispatch(loginUser({ login, email, password }));
    if (ok) navigate("/");
  };

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="grid grid--2">
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
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Password *
        </label>
        <input
          id="password"
          className="input"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="error" style={{ color: "#b91c1c" }}>
          {String(error)}
        </div>
      )}

      <button className="btn btn--primary" type="submit" disabled={loading}>
        {loading ? "..." : "Sign in"}
      </button>

      <div className="altLink">
        Don’t have an account?{" "}
        <a className="link" href="/register">
          Create one →
        </a>
      </div>
    </form>
  );
}
