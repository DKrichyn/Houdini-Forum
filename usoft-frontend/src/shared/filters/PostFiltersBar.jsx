import React, { useMemo } from "react";
import "./PostFiltersBar.css";

export default function PostFiltersBar({
  value,
  categoriesList = [],
  onChange,
  onApply,
  compact = false,
  showStatus = true,
}) {
  const catsMap = useMemo(
    () => new Map(categoriesList.map((c) => [c.id, c.title])),
    [categoriesList]
  );

  const toggleCategory = (id) => {
    const set = new Set(value.categories || []);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ categories: Array.from(set) });
  };

  return (
    <div className={`pfb ${compact ? "pfb--compact" : ""}`}>
      <div className="pfb__row">
        <div className="pfb__group">
          <label className="pfb__label">Sort</label>
          <select
            className="pfb__select"
            value={value.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            <option value="likes">By likes</option>
            <option value="date">By date</option>
          </select>

          <select
            className="pfb__select"
            value={value.order}
            onChange={(e) => onChange({ order: e.target.value })}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          <select
            className="pfb__select"
            value={value.limit}
            onChange={(e) => onChange({ limit: Number(e.target.value) })}
          >
            {[6, 9, 12, 18, 24, 30].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>

        {showStatus && (
          <div className="pfb__group">
            <label className="pfb__label">Status</label>
            <select
              className="pfb__select"
              value={value.status}
              onChange={(e) => onChange({ status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="all">all</option>
            </select>
          </div>
        )}

        <div className="pfb__group pfb__group--grow">
          <label className="pfb__label">Search</label>
          <input
            className="pfb__input"
            placeholder="Title/content…"
            value={value.q || ""}
            onChange={(e) => onChange({ q: e.target.value })}
          />
        </div>

        <div className="pfb__group">
          <label className="pfb__label">From</label>
          <input
            className="pfb__input"
            type="datetime-local"
            value={value.from || ""}
            onChange={(e) => onChange({ from: e.target.value })}
          />
        </div>
        <div className="pfb__group">
          <label className="pfb__label">To</label>
          <input
            className="pfb__input"
            type="datetime-local"
            value={value.to || ""}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </div>

        <div className="pfb__actions">
          <button className="pfb__btn" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>

      <div className="pfb__chips">
        {categoriesList.map((cat) => {
          const active = value.categories?.includes(cat.id);
          return (
            <button
              key={cat.id}
              className={`pfb__chip ${active ? "pfb__chip--on" : ""}`}
              onClick={() => toggleCategory(cat.id)}
              title={cat.title}
            >
              {cat.title}
            </button>
          );
        })}
        {categoriesList.length === 0 && (
          <div className="pfb__muted">No categories</div>
        )}
      </div>
    </div>
  );
}
