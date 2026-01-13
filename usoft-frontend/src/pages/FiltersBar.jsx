import React, { useEffect, useMemo, useState } from "react";
import "./FiltersBar.css";
import { fetchCategoriesApi } from "../features/categories/api";

const SORT_OPTIONS = [
  { value: "likes", label: "By likes" },
  { value: "date", label: "By date" },
];
const ORDER_OPTIONS = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

export default function FiltersBar({ initial, onApply }) {
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState(
    (initial?.categories || []).map(Number)
  );
  const [sort, setSort] = useState(initial?.sort || "likes");
  const [order, setOrder] = useState(initial?.order || "desc");
  const [limit, setLimit] = useState(initial?.limit || 10);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingCats(true);
        const list = await fetchCategoriesApi();
        if (mounted) setCategories(list || []);
      } catch {
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const categoriesLabel = useMemo(() => {
    if (!checked.length) return "Categories";
    const names = checked
      .map((id) => categories.find((c) => Number(c.id) === Number(id))?.title)
      .filter(Boolean);
    return names.length ? names.join(", ") : "Categories";
  }, [checked, categories]);

  function toggleCat(id) {
    const _id = Number(id);
    setChecked((prev) =>
      prev.includes(_id) ? prev.filter((x) => x !== _id) : [...prev, _id]
    );
  }

  function apply() {
    const next = { sort, order, limit: Number(limit) || 10 };
    if (checked.length) next.categories = checked.map(Number);
    onApply?.(next);
  }

  return (
    <div className="filters">
      <details className="filters__dd">
        <summary className="filters__ddBtn">{categoriesLabel}</summary>
        <div className="filters__ddMenu">
          {loadingCats && <div className="filters__hint">Loading…</div>}
          {!loadingCats && categories.length === 0 && (
            <div className="filters__hint">No categories.</div>
          )}
          {!loadingCats &&
            categories.map((c) => (
              <label key={c.id} className="filters__ddItem">
                <input
                  type="checkbox"
                  checked={checked.includes(Number(c.id))}
                  onChange={() => toggleCat(c.id)}
                />
                <span>{c.title}</span>
              </label>
            ))}
        </div>
      </details>

      <select
        className="filters__select"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className="filters__select"
        value={order}
        onChange={(e) => setOrder(e.target.value)}
      >
        {ORDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <input
        className="filters__number"
        type="number"
        min={1}
        max={15}
        value={limit}
        onChange={(e) =>
          setLimit(Math.max(1, Math.min(15, Number(e.target.value) || 1)))
        }
      />

      <button type="button" className="filters__apply" onClick={apply}>
        Apply
      </button>
    </div>
  );
}
