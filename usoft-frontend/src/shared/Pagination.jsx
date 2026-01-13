import React from "react";
import "./Pagination.css";

function range(from, to) {
  const a = [];
  for (let i = from; i <= to; i++) a.push(i);
  return a;
}

export default function Pagination({
  page = 1,
  total = 0,
  limit = 5,
  onPageChange,
}) {
  const totalPages = Math.max(
    1,
    Math.ceil((Number(total) || 0) / (Number(limit) || 5))
  );

  if (totalPages <= 1) return null;

  const go = (p) => {
    const np = Math.max(1, Math.min(totalPages, p));
    if (np !== page) onPageChange?.(np);
  };

  const maxButtons = 7;
  let pages = [];

  if (totalPages <= maxButtons) {
    pages = range(1, totalPages);
  } else {
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    pages = [1];
    if (left > 2) pages.push("…");
    pages = pages.concat(range(left, right));
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <nav className="pg" aria-label="Pagination">
      <button
        className="pg__btn"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
      >
        ‹ Prev
      </button>

      <ul className="pg__list">
        {pages.map((p, i) =>
          p === "…" ? (
            <li key={`e-${i}`} className="pg__ellipsis">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                className={`pg__page ${page === p ? "is-active" : ""}`}
                onClick={() => go(p)}
                aria-current={page === p ? "page" : undefined}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        className="pg__btn"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
      >
        Next ›
      </button>
    </nav>
  );
}
