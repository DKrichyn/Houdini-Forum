function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

const baseOpts = {
  headers: { Accept: "application/json", "Cache-Control": "no-store" },
  cache: "no-store",
};

export async function fetchPostsApi(params = {}) {
  const { match, ...rest } = params;

  const page = Number(rest.page) >= 1 ? Number(rest.page) : 1;
  const limit = Math.max(1, Math.min(100, Number(rest.limit) || 10));
  const sort = rest.sort === "date" ? "date" : "likes";
  const order = rest.order === "asc" ? "asc" : "desc";
  const status =
    rest.status === "inactive" || rest.status === "all"
      ? rest.status
      : "active";

  const q = { page, limit, sort, order, status };

  if (Array.isArray(rest.categories)) {
    const arr = rest.categories.map(Number).filter(Number.isFinite);
    if (arr.length === 1) {
      q.categoryId = arr[0];
    } else if (arr.length > 1) {
      q.categories = arr.join(",");
    }
  } else if (typeof rest.categories === "string" && rest.categories.trim()) {
    q.categoryId = Number(rest.categories.trim());
  }

  Object.entries(rest).forEach(([k, v]) => {
    if (k in q) return;
    if (v === undefined || v === null || v === "") return;
    q[k] = v;
  });

  const qs = toQuery(q);

  const res = await fetch(`/api/posts${qs}`, { ...baseOpts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getPostByIdApi(id) {
  const res = await fetch(`/api/posts/${id}`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostCategoriesApi(id) {
  const res = await fetch(`/api/posts/${id}/categories`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostCommentsApi(id) {
  const res = await fetch(`/api/posts/${id}/comments`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getPostReactionsApi(id) {
  const res = await fetch(`/api/posts/${id}/like`, { ...baseOpts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setPostReactionApi(id, type, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function clearPostReactionApi(id, token) {
  const res = await fetch(`/api/posts/${id}/like`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

export async function listCategoriesApi() {
  const res = await fetch(`/api/categories`, { ...baseOpts });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getCategoryPostsApi(categoryId) {
  const res = await fetch(`/api/categories/${categoryId}/posts`, {
    ...baseOpts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createPostApi(body, token) {
  const res = await fetch(`/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updatePostApi(id, body, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deletePostApi(id, token) {
  const res = await fetch(`/api/posts/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return true;
}

export async function adminDeletePostApi(id, token) {
  const res = await fetch(`/api/admin/posts/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `HTTP ${res.status}`);
  }
  return true;
}

/** NEW: Admin — toggle post status */
export async function adminSetPostStatusApi(id, status, token) {
  const res = await fetch(`/api/admin/posts/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
    body: JSON.stringify({ status }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }
  if (!res.ok) {
    const err =
      data && typeof data === "object"
        ? data
        : { error: res.statusText, status: res.status, data };
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function adminListPostsApi(params = {}, token) {
  const page = Number(params.page) >= 1 ? Number(params.page) : 1;
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
  const sort = params.sort === "date" ? "date" : "likes";
  const order = params.order === "asc" ? "asc" : "desc";

  const q = new URLSearchParams({ page, limit, sort, order }).toString();
  const url = q ? `/api/admin/posts?${q}` : `/api/admin/posts`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const e =
      data && typeof data === "object" ? data : { error: res.statusText };
    throw new Error(e?.error || `HTTP ${res.status}`);
  }

  if (Array.isArray(data)) {
    return {
      total: data.length,
      page: 1,
      limit: data.length,
      items: data,
    };
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: Number(data?.total ?? items.length),
    page: Number(data?.page ?? page),
    limit: Number(data?.limit ?? limit),
    items,
  };
}
