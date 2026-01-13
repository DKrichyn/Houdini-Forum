import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./PostCard.css";
import { adminDeletePostApi, deletePostApi } from "../features/posts/api";
import { useSelector } from "react-redux";
import { selectAuthUser, selectAuthToken } from "../features/auth/selectors";
import { useConfirm } from "./ui/ConfirmProvider";

const authorCache = new Map();

export default function PostCard({
  post,
  variant = "card",
  showDelete = false,
  adminDelete = false,
  onDeleted,
  onDeleteFailed,
  showEdit = false,
}) {
  const {
    id,
    title,
    content,
    authorLogin,
    authorFullName,
    authorId,
    createdAt,
    likesCount = 0,
    dislikesCount = 0,
    commentsCount: commentsCountFromServer,
    status,
  } = post || {};

  const navigate = useNavigate();
  const me = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);
  const isOwner = me?.id && post?.authorId === me.id;
  const isActive = (status ?? "active") === "active";

  const [cats, setCats] = useState(post?.categories || []);
  const [catsLoading, setCatsLoading] = useState(false);
  const [busyDel, setBusyDel] = useState(false);

  const { confirm, alert } = useConfirm();

  const [commentsCount, setCommentsCount] = useState(
    typeof commentsCountFromServer === "number" ? commentsCountFromServer : 0
  );

  const [authorName, setAuthorName] = useState(
    (authorFullName && authorFullName.trim()) || ""
  );

  useEffect(() => {
    if (authorFullName && authorFullName.trim()) {
      setAuthorName(authorFullName.trim());
      return;
    }

    if (!authorId) {
      const fallback = (authorLogin && authorLogin.trim()) || "Unknown";
      setAuthorName(fallback);
      return;
    }

    if (authorCache.has(authorId)) {
      const a = authorCache.get(authorId);
      setAuthorName(a.fullName?.trim() || a.login?.trim() || "Unknown");
      return;
    }

    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${authorId}`, {
          headers: { Accept: "application/json", "Cache-Control": "no-store" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const u = await res.json();
        const name =
          (u?.fullName && String(u.fullName).trim()) ||
          (u?.login && String(u.login).trim()) ||
          "Unknown";
        if (!abort) {
          authorCache.set(authorId, { fullName: u?.fullName, login: u?.login });
          setAuthorName(name);
        }
      } catch {
        if (!abort) {
          setAuthorName((authorLogin && authorLogin.trim()) || "Unknown");
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [authorId, authorFullName, authorLogin]);

  useEffect(() => {
    let aborted = false;
    async function ensureComments() {
      if (!id) return;
      if (typeof commentsCountFromServer === "number") {
        setCommentsCount(commentsCountFromServer);
        return;
      }
      try {
        const res = await fetch(`/api/posts/${id}/comments`, {
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (!aborted) setCommentsCount(Array.isArray(list) ? list.length : 0);
      } catch {
        /* ignore */
      }
    }
    ensureComments();
    return () => {
      aborted = true;
    };
  }, [id, commentsCountFromServer]);

  useEffect(() => {
    let abort = false;
    async function loadCats() {
      if (!id || post?.categories) return;
      try {
        setCatsLoading(true);
        const res = await fetch(`/api/posts/${id}/categories`, {
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setCats([]);
      } finally {
        if (!abort) setCatsLoading(false);
      }
    }
    loadCats();
    return () => {
      abort = true;
    };
  }, [id, post?.categories]);

  const onOpen = useCallback(() => {
    if (!id) return;
    navigate(`/posts/${id}`, { state: { post } });
  }, [id, post, navigate]);

  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  async function handleDelete(e) {
    e.stopPropagation();
    if (!id) return;

    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to delete posts.",
        confirmText: "OK",
      });
      return;
    }

    if (!adminDelete && !isOwner) {
      await alert({
        title: "Not allowed",
        message: "You can only delete your own post.",
        confirmText: "OK",
      });
      return;
    }

    const confirmed = await confirm({
      title: adminDelete ? "Admin action" : "Delete post",
      message: adminDelete
        ? `Delete post “${title}” as admin?\nThis cannot be undone.`
        : `Delete your post “${title}”?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
    });
    if (!confirmed) return;

    onDeleted?.(id, post);
    setBusyDel(true);

    try {
      if (adminDelete) {
        await adminDeletePostApi(id, token);
      } else {
        await deletePostApi(id, token);
      }
    } catch (err) {
      await alert({
        title: "Delete failed",
        message: "Failed to delete. Restoring…",
        confirmText: "OK",
      });
      onDeleteFailed?.(id, post);
    } finally {
      setBusyDel(false);
    }
  }

  function handleEdit(e) {
    e.stopPropagation();
    if (id && isOwner) navigate(`/posts/${id}/edit`);
  }

  const previewText = content || "";

  return (
    <article
      className={[
        "pc",
        variant === "line" ? "pc--line" : "pc--card",
        "pc--clickable",
        !isActive ? "pc--inactive" : "",
      ].join(" ")}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={`Open post "${title}"`}
    >
      {/* Header (author + date) */}
      <header className="pc__head" onClick={(e) => e.stopPropagation()}>
        <div className="pc__meta">
          <span className="pc__author">{authorName || "Unknown"}</span>
          <span className="pc__dot">•</span>
          {createdAt &&
            (() => {
              const dt = new Date(createdAt);
              const label = dt.toLocaleString(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <time
                  className="pc__date"
                  dateTime={dt.toISOString()}
                  title={dt.toISOString()}
                >
                  {label}
                </time>
              );
            })()}
        </div>
      </header>

      {/* Title + preview */}
      <div className="pc__main">
        <h3 className="pc__title">{title}</h3>
        <p className="pc__preview" title={previewText}>
          {previewText}
        </p>
      </div>

      {/* Categories */}
      <div className="pc__cats" onClick={(e) => e.stopPropagation()}>
        {catsLoading && (
          <span className="pc__cat pc__cat--loading">Loading…</span>
        )}
        {!catsLoading &&
          cats?.length > 0 &&
          cats.map((c) => (
            <span key={c.id} className="pc__cat">
              #{c.title}
            </span>
          ))}
        {!catsLoading && (!cats || cats.length === 0) && (
          <span className="pc__cat pc__cat--empty">no categories</span>
        )}
      </div>

      {/* Footer */}
      <footer className="pc__foot" onClick={(e) => e.stopPropagation()}>
        <div className="pc__badges" aria-label="Post stats">
          <span className="pc-badge" title="Likes">
            <span className="pc-badge__icon">👍</span>
            <span className="pc-badge__val">{likesCount}</span>
          </span>
          <span className="pc-badge" title="Dislikes">
            <span className="pc-badge__icon">👎</span>
            <span className="pc-badge__val">{dislikesCount}</span>
          </span>
          <span className="pc-badge" title="Comments">
            <span className="pc-badge__icon">💬</span>
            <span className="pc-badge__val">{commentsCount}</span>
          </span>
        </div>

        <div className="pc__actions">
          {/* Edit — лише для власника і тільки коли пост активний */}
          {showEdit && isOwner && isActive && (
            <button
              type="button"
              className="pc__btn pc__btn--edit"
              onClick={handleEdit}
              title="Edit post"
            >
              Edit
            </button>
          )}

          {/* Delete — завжди функціональна */}
          {showDelete && (
            <button
              type="button"
              className="pc__btn pc__btn--danger"
              onClick={handleDelete}
              disabled={busyDel}
              title={adminDelete ? "Admin: delete post" : "Delete my post"}
            >
              {busyDel ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
