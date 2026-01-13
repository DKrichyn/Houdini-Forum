import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PostCard from "../shared/PostCard";
import Pagination from "../shared/Pagination";
import { fetchCategoriesApi } from "../features/categories/api";
import { selectAuthToken, selectAuthUser } from "../features/auth/selectors";
import "./HomePage.css";

function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.append(k, String(v));
  });
  return sp.toString();
}

async function fetchPostById(id, { token } = {}) {
  const res = await fetch(`/api/posts/${id}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPublicPostsAll({ token } = {}) {
  const res = await fetch(`/api/posts`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
}

async function fetchAdminPostsAll({ token, status } = {}) {
  const qs = status && status !== "all" ? `?${buildQuery({ status })}` : "";
  const res = await fetch(`/api/admin/posts${qs}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
}

async function fetchCategoryPostsList(categoryId, { token, status } = {}) {
  const id = Number(categoryId);
  const qs = status && status !== "all" ? `?${buildQuery({ status })}` : "";
  const res = await fetch(`/api/categories/${id}/posts${qs}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : [];
}

function dedupeById(list) {
  const m = new Map();
  for (const p of list || []) {
    if (!p || p.id == null) continue;
    if (!m.has(p.id)) m.set(p.id, p);
  }
  return [...m.values()];
}

function clientSort(list, sort, order) {
  const dir = order === "asc" ? 1 : -1;
  const arr = [...(list || [])];
  if (sort === "date") {
    arr.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir);
  } else {
    arr.sort((a, b) => ((a.likesCount || 0) - (b.likesCount || 0)) * dir);
  }
  return arr;
}

function clientPaginate(list, page, limit) {
  const start = (page - 1) * limit;
  return list.slice(start, start + limit);
}

async function withConcurrency(keys, worker, max = 5) {
  const results = new Array(keys.length);
  let i = 0;
  async function w() {
    while (i < keys.length) {
      const idx = i++;
      results[idx] = await worker(keys[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(max, keys.length) }, w));
  return results;
}

const SORT_OPTIONS = [
  { value: "likes", label: "By likes" },
  { value: "date", label: "By date" },
];
const ORDER_OPTIONS = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export default function HomePage() {
  const token = useSelector(selectAuthToken);
  const me = useSelector(selectAuthUser);
  const isAdmin = me?.role === "admin";

  const [categories, setCategories] = useState([]);
  const [checkedDraft, setCheckedDraft] = useState([]);
  const [sortDraft, setSortDraft] = useState("likes");
  const [orderDraft, setOrderDraft] = useState("desc");
  const [limitDraft, setLimitDraft] = useState(5);
  const [statusDraft, setStatusDraft] = useState("active");

  const [checked, setChecked] = useState([]);
  const [sort, setSort] = useState("likes");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(5);
  const [status, setStatus] = useState("active");

  const [items, setItems] = useState([]);
  const [allItems, setAll] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const catDDRef = useRef(null);
  const lastRemovedRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCategoriesApi();
        if (!mounted) return;
        const norm = Array.isArray(list)
          ? list.map((c) => ({ ...c, id: Number(c.id) }))
          : [];
        setCategories(norm);
      } catch {
        if (mounted) setCategories([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedSummary = useMemo(() => {
    if (!checkedDraft.length) return "Categories";
    const names = checkedDraft
      .map((id) => categories.find((c) => Number(c.id) === Number(id))?.title)
      .filter(Boolean);
    if (names.length > 2)
      return `${names.slice(0, 2).join(", ")}… (+${names.length - 2})`;
    return names.join(", ");
  }, [checkedDraft, categories]);

  function toggleCat(rawId) {
    const id = Number(rawId);
    setCheckedDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function hydrateVisible(list) {
    const need = (list || []).filter(
      (p) => !p?.content && Number.isFinite(Number(p?.id))
    );
    if (!need.length) return;

    try {
      const full = await withConcurrency(
        need,
        (p) => fetchPostById(p.id, { token }).catch(() => null),
        6
      );
      const map = new Map(full.filter(Boolean).map((f) => [f.id, f]));
      if (map.size === 0) return;

      setItems((prev) =>
        prev.map((p) => (map.has(p.id) ? { ...p, ...map.get(p.id) } : p))
      );
      setAll((prev) =>
        prev.map((p) => (map.has(p.id) ? { ...p, ...map.get(p.id) } : p))
      );
    } catch {}
  }

  async function fetchPostsAtPage(targetPage, opts = {}) {
    const useChecked = opts.checked ?? checked;
    const useSort = opts.sort ?? sort;
    const useOrder = opts.order ?? order;
    const useLimit = opts.limit ?? limit;
    const useStatus = opts.status ?? status;

    setLoading(true);
    setErr(null);
    try {
      const selected = (useChecked || []).map(Number).filter(Number.isFinite);

      if (selected.length > 0) {
        const lists = await withConcurrency(
          selected,
          (cid) =>
            fetchCategoryPostsList(cid, {
              token,
              status: isAdmin ? useStatus : "active",
            }),
          5
        );
        let union = dedupeById(lists.flat());

        if (!isAdmin) {
          union = union.filter((p) => (p.status ?? "active") === "active");
        } else {
          if (useStatus === "active") {
            union = union.filter((p) => (p.status ?? "active") === "active");
          } else if (useStatus === "inactive") {
            union = union.filter((p) => (p.status ?? "active") === "inactive");
          }
        }

        const sorted = clientSort(union, useSort, useOrder);
        const totalCount = sorted.length;
        const maxPage = Math.max(1, Math.ceil(totalCount / useLimit));
        const currentPage = Math.min(targetPage, maxPage);
        const paged = clientPaginate(sorted, currentPage, useLimit);

        setAll(sorted);
        setItems(paged);
        setTotal(totalCount);
        setPage(currentPage);

        hydrateVisible(paged);
        return;
      }

      if (!isAdmin) {
        let posts = await fetchPublicPostsAll({ token });
        posts = posts.filter((p) => (p.status ?? "active") === "active");

        const sorted = clientSort(posts, useSort, useOrder);
        const totalCount = sorted.length;
        const maxPage = Math.max(1, Math.ceil(totalCount / useLimit));
        const currentPage = Math.min(targetPage, maxPage);
        const paged = clientPaginate(sorted, currentPage, useLimit);

        setAll(sorted);
        setItems(paged);
        setTotal(totalCount);
        setPage(currentPage);

        hydrateVisible(paged);
      } else {
        let posts = await fetchAdminPostsAll({ token, status: useStatus });

        if (useStatus === "active") {
          posts = posts.filter((p) => (p.status ?? "active") === "active");
        } else if (useStatus === "inactive") {
          posts = posts.filter((p) => (p.status ?? "active") === "inactive");
        }

        const sorted = clientSort(posts, useSort, useOrder);
        const totalCount = sorted.length;
        const maxPage = Math.max(1, Math.ceil(totalCount / useLimit));
        const currentPage = Math.min(targetPage, maxPage);
        const paged = clientPaginate(sorted, currentPage, useLimit);

        setAll(sorted);
        setItems(paged);
        setTotal(totalCount);
        setPage(currentPage);

        hydrateVisible(paged);
      }
    } catch (e) {
      setErr(e?.message || "Failed to fetch posts");
      setItems([]);
      setAll([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPostsAtPage(1);
  }, [isAdmin]);

  function handleApply() {
    const clamped = Math.max(1, Math.min(15, Number(limitDraft) || 5));

    setChecked(checkedDraft);
    setSort(sortDraft);
    setOrder(orderDraft);
    setLimit(clamped);
    setStatus(statusDraft);

    fetchPostsAtPage(1, {
      checked: checkedDraft,
      sort: sortDraft,
      order: orderDraft,
      limit: clamped,
      status: statusDraft,
    });

    setPage(1);
    if (catDDRef.current) catDDRef.current.removeAttribute("open");
  }

  function handlePageChange(newPage) {
    const paged = clientPaginate(allItems, newPage, limit);
    setItems(paged);
    setPage(newPage);
    hydrateVisible(paged);
  }

  function handleCardDeleted(id, post) {
    lastRemovedRef.current = { id, post };
    const filtered = allItems.filter((p) => p.id !== id);
    setAll(filtered);

    const totalCount = filtered.length;
    const maxPage = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(page, maxPage);
    setItems(clientPaginate(filtered, currentPage, limit));
    setTotal(totalCount);
    setPage(currentPage);
  }

  function handleDeleteFailed() {
    fetchPostsAtPage(page);
    lastRemovedRef.current = null;
  }

  return (
    <div className="home">
      <section className="home__panel">
        {/* Фільтри */}
        <div className="filters" role="region" aria-label="Feed filters">
          <details className="filters__dd" ref={catDDRef}>
            <summary className="filters__dd-btn">{selectedSummary}</summary>
            <div className="filters__dd-menu">
              {categories.length === 0 ? (
                <div className="filters__dd-empty">No categories.</div>
              ) : (
                categories.map((c) => (
                  <label key={c.id} className="filters__dd-item">
                    <input
                      type="checkbox"
                      checked={checkedDraft.includes(Number(c.id))}
                      onChange={() => toggleCat(c.id)}
                    />
                    <span>#{c.title}</span>
                  </label>
                ))
              )}
            </div>
          </details>

          <div className="filters__group">
            <select
              className="filters__select"
              value={sortDraft}
              onChange={(e) => setSortDraft(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filters__group">
            <select
              className="filters__select"
              value={orderDraft}
              onChange={(e) => setOrderDraft(e.target.value)}
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filters__group">
            <input
              className="filters__number"
              type="number"
              min={1}
              max={15}
              value={limitDraft}
              onChange={(e) => {
                const n = Math.max(
                  1,
                  Math.min(15, Number(e.target.value) || 1)
                );
                setLimitDraft(n);
              }}
            />
          </div>

          {isAdmin && (
            <div className="filters__group">
              <select
                className="filters__select"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filters__actions">
            <button
              type="button"
              className="filters__apply"
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? "…" : "Apply"}
            </button>
          </div>
        </div>

        <div className="home__list">
          {loading && <div className="home__state">Loading…</div>}
          {err && !loading && (
            <div className="home__state home__state--err">⚠ {err}</div>
          )}
          {!loading && !err && items.length === 0 && (
            <div className="home__state">No posts.</div>
          )}

          {!loading && !err && items.length > 0 && (
            <div className="home__col">
              {items.map((p) => (
                <div
                  key={p.id}
                  className={`home__item ${
                    p.status === "inactive" ? "home__item--inactive" : ""
                  }`}
                >
                  <PostCard
                    post={p}
                    variant="line"
                    showDelete={isAdmin}
                    adminDelete={true}
                    onDeleted={handleCardDeleted}
                    onDeleteFailed={handleDeleteFailed}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Пагінація: CLIENT-SIDE */}
        <Pagination
          page={page}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
        />
      </section>
    </div>
  );
}
