import React, { useEffect, useMemo, useState } from "react";
import "./ProfileBottom.css";
import { useSelector } from "react-redux";
import { selectAuthToken } from "../../features/auth/selectors";
import { fetchCategoriesApi } from "../../features/categories/api";
import PostCard from "../../shared/PostCard";
import Pagination from "../../shared/Pagination";

const SORT_OPTIONS = [
  { value: "likes", label: "By likes" },
  { value: "date", label: "By date" },
];
const ORDER_OPTIONS = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

async function fetchUserPostsAll(userId, { token } = {}) {
  const res = await fetch(`/api/users/${userId}/posts`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchUserFavorites(userId, { token } = {}) {
  const res = await fetch(`/api/users/${userId}/favorites`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchCategoryPostsList(categoryId, { token } = {}) {
  const res = await fetch(`/api/categories/${categoryId}/posts`, {
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

async function fetchPostCategories(postId, { token } = {}) {
  const res = await fetch(`/api/posts/${postId}/categories`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function withConcurrency(list, worker, max = 6) {
  const out = new Array(list.length);
  let idx = 0;
  async function w() {
    while (idx < list.length) {
      const i = idx++;
      out[i] = await worker(list[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(max, list.length) }, w));
  return out;
}

function dedupeById(arr) {
  const map = new Map();
  for (const p of arr || []) {
    if (p && !map.has(p.id)) map.set(p.id, p);
  }
  return Array.from(map.values());
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

export default function ProfileBottom({ userId, userLogin }) {
  const token = useSelector(selectAuthToken);

  const [categories, setCategories] = useState([]);
  const [checkedDraft, setCheckedDraft] = useState([]);
  const [sortDraft, setSortDraft] = useState("likes");
  const [orderDraft, setOrderDraft] = useState("desc");
  const [limitDraft, setLimitDraft] = useState(5);

  const [checked, setChecked] = useState([]);
  const [sort, setSort] = useState("likes");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(5);

  const [activeTab, setActiveTab] = useState("my");

  const [full, setFull] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCategoriesApi();
        if (mounted) setCategories(list || []);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedSummary = useMemo(() => {
    if (!checkedDraft.length) return "Categories";
    const names = checkedDraft
      .map((id) => categories.find((c) => c.id === id)?.title)
      .filter(Boolean);
    if (names.length > 2)
      return `${names.slice(0, 2).join(", ")}… (+${names.length - 2})`;
    return names.join(", ");
  }, [checkedDraft, categories]);

  function toggleCat(id) {
    setCheckedDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function applyAtPage(targetPage, opts = {}) {
    if (!userId && !userLogin) return;
    setLoading(true);
    setError(null);

    const useChecked = opts.checked ?? checked;
    const useSort = opts.sort ?? sort;
    const useOrder = opts.order ?? order;
    const useLimit = opts.limit ?? limit;

    try {
      let baseList = [];

      if (activeTab === "fav") {
        const favs = await fetchUserFavorites(userId, { token });
        if (!useChecked.length) {
          baseList = favs;
        } else {
          const picked = new Set(useChecked);
          const catMaps = await withConcurrency(
            favs,
            async (p) => {
              const list = await fetchPostCategories(p.id, { token });
              const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
              return { id: p.id, catIds: ids };
            },
            8
          );
          baseList = favs.filter((p) => {
            const rec = catMaps.find((x) => x.id === p.id);
            return rec && rec.catIds.some((cid) => picked.has(cid));
          });
        }
      } else {
        const mineAll = await fetchUserPostsAll(userId, { token });
        if (!useChecked.length) {
          baseList = mineAll;
        } else {
          const picked = new Set(useChecked);
          const catMaps = await withConcurrency(
            mineAll,
            async (p) => {
              const list = await fetchPostCategories(p.id, { token });
              const ids = (Array.isArray(list) ? list : []).map((c) => c.id);
              return { id: p.id, catIds: ids };
            },
            8
          );
          baseList = mineAll.filter((p) => {
            const rec = catMaps.find((x) => x.id === p.id);
            return rec && rec.catIds.some((cid) => picked.has(cid));
          });
        }
      }

      const sorted = clientSort(baseList, useSort, useOrder);
      const totalCount = sorted.length;
      const maxPage = Math.max(1, Math.ceil(totalCount / useLimit));
      const currentPage = Math.min(targetPage, maxPage);
      const paged = clientPaginate(sorted, currentPage, useLimit);

      setFull(sorted);
      setItems(paged);
      setTotal(totalCount);
      setPage(currentPage);
    } catch (e) {
      setError(e?.message || "Failed to fetch posts");
      setFull([]);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId || userLogin) applyAtPage(1);
  }, [userId, userLogin, activeTab]);

  function handleApply() {
    const clamped = Math.max(1, Math.min(15, Number(limitDraft) || 5));
    setChecked(checkedDraft);
    setSort(sortDraft);
    setOrder(orderDraft);
    setLimit(clamped);
    setPage(1);
    applyAtPage(1, {
      checked: checkedDraft,
      sort: sortDraft,
      order: orderDraft,
      limit: clamped,
    });
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    setItems(clientPaginate(full, newPage, limit));
  }

  useEffect(() => {
    setItems(clientPaginate(full, 1, limit));
    setPage(1);
  }, [limit, full]);

  function handlePostDeletedOptimistic(postId) {
    if (activeTab !== "my") return;
    setFull((prev) => {
      const next = prev.filter((p) => p.id !== postId);
      const nt = next.length;
      const np = Math.max(1, Math.min(page, Math.ceil(nt / limit) || 1));
      setTotal(nt);
      setPage(np);
      setItems(clientPaginate(next, np, limit));
      return next;
    });
  }

  return (
    <section className="pb-panel">
      {/* --- ФІЛЬТРИ --- */}
      <div className="pb-filters">
        <details className="pb-dd">
          <summary className="pb-dd__button">{selectedSummary}</summary>
          <div className="pb-dd__menu">
            {categories.length === 0 ? (
              <div className="pb-dd__empty">No categories.</div>
            ) : (
              categories.map((c) => (
                <label key={c.id} className="pb-dd__item">
                  <input
                    type="checkbox"
                    checked={checkedDraft.includes(c.id)}
                    onChange={() => toggleCat(c.id)}
                  />
                  <span>{c.title}</span>
                </label>
              ))
            )}
          </div>
        </details>

        <select
          className="pb-select"
          value={sortDraft}
          onChange={(e) => setSortDraft(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="pb-select"
          value={orderDraft}
          onChange={(e) => setOrderDraft(e.target.value)}
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          className="pb-number"
          type="number"
          min={1}
          max={15}
          value={limitDraft}
          onChange={(e) => {
            const v = Math.max(1, Math.min(15, Number(e.target.value) || 1));
            setLimitDraft(v);
          }}
        />

        <div className="pb-actions">
          <button
            type="button"
            className="pb-apply"
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? "..." : "Apply"}
          </button>
        </div>
      </div>

      {/* --- ТАБИ --- */}
      <div className="pb-tabs">
        <button
          className={`pb-tab ${activeTab === "my" ? "is-active" : ""}`}
          onClick={() => setActiveTab("my")}
        >
          My posts
        </button>
        <button
          className={`pb-tab ${activeTab === "fav" ? "is-active" : ""}`}
          onClick={() => setActiveTab("fav")}
        >
          Favorites
        </button>
      </div>

      {/* --- ТІЛО --- */}
      <div className="pb-body">
        {loading && <div className="pb-state">Loading posts…</div>}
        {error && !loading && (
          <div className="pb-state pb-state--err">⚠ {String(error)}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="pb-state">No posts.</div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="pb-col">
              {items.map((p) => (
                <div key={p.id} className="pb-item">
                  <PostCard
                    post={p}
                    variant="line"
                    showEdit={activeTab === "my"}
                    showDelete={activeTab === "my"}
                    adminDelete={false}
                    onDeleted={handlePostDeletedOptimistic}
                  />
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
