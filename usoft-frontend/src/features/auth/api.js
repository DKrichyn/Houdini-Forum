import { apiSend, apiGet } from "../../shared/lib/apiClient";

export const registerApi = (payload) =>
  apiSend("/api/auth/register", "POST", payload);

export const loginApi = ({ login, email, password }) =>
  apiSend("/api/auth/login", "POST", { login, email, password });

export const getUserByIdApi = (id) => apiGet(`/api/users/${id}`);

export const requestPasswordResetApi = (email) =>
  apiSend("/api/auth/password-reset", "POST", { email });

export const confirmPasswordResetApi = (token, password) =>
  apiSend(`/api/auth/password-reset/${encodeURIComponent(token)}`, "POST", {
    password,
  });
