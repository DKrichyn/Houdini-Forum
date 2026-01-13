import {
  apiGet,
  apiPatch,
  apiPost,
  apiDelete,
  apiUpload,
} from "../../shared/lib/apiClient";

export const getUserById = (id) => apiGet(`/api/users/${id}`);

export function updateUserApi({ id, data }) {
  return apiPatch(`/api/users/${id}`, data);
}

export function updateAvatarApi({ file }) {
  const fd = new FormData();
  fd.append("avatar", file);
  return apiUpload("/api/users/avatar", fd);
}

export function deleteUserApi(id) {
  return apiDelete(`/api/users/${id}`);
}

export function listUsersAdmin() {
  return apiGet("/api/admin/users");
}

export function createUserAdmin(body) {
  return apiPost("/api/admin/users", body);
}

export function updateUserAdmin(id, body) {
  return apiPatch(`/api/admin/users/${id}`, body);
}

export function deleteUserAdmin(id) {
  return apiDelete(`/api/admin/users/${id}`);
}
