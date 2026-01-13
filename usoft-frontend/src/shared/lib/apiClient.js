import { getToken, clearToken } from "../../services/storage";

const BASE_URL = process.env.REACT_APP_API_URL || "";

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function isAdminApiUrl(u) {
  try {
    const url =
      typeof u === "string"
        ? new URL(u, BASE_URL || window.location.origin)
        : u;
    return /\/api\/admin\//.test(url.pathname);
  } catch {
    return false;
  }
}

function reauthRedirect(reason = "permissions_updated") {
  try {
    clearToken();
  } catch {}
  try {
    localStorage.setItem("usof_reauth_reason", reason);
  } catch {}

  window.location.assign("/login?reason=" + encodeURIComponent(reason));
}

async function handle(res, reqUrl) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    if (res.status === 403 && isAdminApiUrl(reqUrl)) {
      reauthRedirect("admin_forbidden_token");
      const err = new Error(
        "Forbidden (admin token mismatch). Redirecting to login…"
      );
      err.status = 403;
      err.data = data;
      throw err;
    }

    const msg =
      (data && (data.error || data.message)) ||
      res.statusText ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiSend(path, method = "GET", body, extraHeaders = {}) {
  const isJson = body && !(body instanceof FormData);
  const url = buildUrl(path);
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      ...(isJson ? { "Content-Type": "application/json" } : {}),
      ...authHeader(),
      ...extraHeaders,
    },
    body: body ? (isJson ? JSON.stringify(body) : body) : undefined,
  });
  return handle(res, url);
}

export const apiGet = (path, params) => {
  const url = buildUrl(path, params);
  return fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      ...authHeader(),
    },
  }).then((res) => handle(res, url));
};

export const apiPost = (path, body) => apiSend(path, "POST", body);
export const apiPatch = (path, body) => apiSend(path, "PATCH", body);
export const apiDelete = (path) => apiSend(path, "DELETE");

export async function apiUpload(urlPath, formDataOrOptions) {
  const fd =
    formDataOrOptions instanceof FormData
      ? formDataOrOptions
      : (() => {
          const fd = new FormData();
          const {
            file,
            fileField = "file",
            fields = {},
          } = formDataOrOptions || {};
          if (file) fd.append(fileField, file);
          Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
          return fd;
        })();

  const url = buildUrl(urlPath);
  const res = await fetch(url, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      ...authHeader(),
    },
    body: fd,
  });
  return handle(res, url);
}
