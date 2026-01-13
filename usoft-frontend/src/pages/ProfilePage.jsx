import React, { useEffect, useRef, useState } from "react";
import "./ProfilePage.css";
import { useSelector, useDispatch } from "react-redux";
import { selectAuthUser } from "../features/auth/selectors";
import Modal from "../shared/ui/Modal";
import {
  updateUserApi,
  updateAvatarApi,
  deleteUserApi,
} from "../features/users/api";
import { setUser } from "../features/auth/actions";
import ProfileBottom from "./profile/ProfileBottom";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchPostsApi, getPostCommentsApi } from "../features/posts/api";

import { requestPasswordResetApi } from "../features/auth/api";

import { useConfirm } from "../shared/ui/ConfirmProvider";

export default function ProfilePage() {
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { search } = useLocation();

  const { confirm, alert } = useConfirm();

  const fullName0 = user?.fullName || user?.login || "User";
  const login = user?.login || "login";
  const email = user?.email || "user@example.com";
  const avatarUrl = user?.avatarUrl || null;

  const [stats, setStats] = useState({
    likes: 0,
    dislikes: 0,
    comments: 0,
    rating: user?.rating ?? 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const [openName, setOpenName] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [openAvatar, setOpenAvatar] = useState(false);

  const [fullName, setFullName] = useState(fullName0);
  const [savingName, setSavingName] = useState(false);

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || user?.login || "User");
    setStats((s) => ({ ...s, rating: user?.rating ?? 0 }));
  }, [user?.fullName, user?.login, user?.rating]);

  useEffect(() => {
    const sp = new URLSearchParams(search);
    const modal = sp.get("modal");
    if (modal === "edit-name") setOpenName(true);
    if (modal === "change-password") setOpenPassword(true);
    if (modal === "change-avatar") setOpenAvatar(true);
  }, [search]);

  function clearModalParam() {
    const sp = new URLSearchParams(search);
    if (sp.has("modal")) {
      sp.delete("modal");
      navigate(
        { search: sp.toString() ? `?${sp.toString()}` : "" },
        { replace: true }
      );
    }
  }
  useEffect(() => {
    const sp = new URLSearchParams(search);
    const modal = sp.get("modal");
    if (modal === "edit-name") setOpenName(true);
    if (modal === "change-password") setOpenPassword(true);
    if (modal === "change-avatar") setOpenAvatar(true);

    if (modal === "delete-account") {
      (async () => {
        await onDeleteAccount();
        clearModalParam();
      })();
    }
  }, [search]);

  async function submitName(e) {
    e.preventDefault();
    if (!user?.id) {
      await alert({
        title: "Update name",
        message: "No user id",
        confirmText: "OK",
      });
      return;
    }
    if (!fullName?.trim()) {
      await alert({
        title: "Update name",
        message: "Enter name",
        confirmText: "OK",
      });
      return;
    }

    try {
      setSavingName(true);
      const updated = await updateUserApi({
        id: user.id,
        data: { fullName },
      });
      dispatch(setUser(updated));
      setOpenName(false);
      clearModalParam();
      await alert({
        title: "Saved",
        message: "Your name was updated.",
        confirmText: "OK",
      });
    } catch (err) {
      await alert({
        title: "Update failed",
        message: err?.error || err?.message || "Failed to update name",
        confirmText: "OK",
      });
    } finally {
      setSavingName(false);
    }
  }

  async function submitAvatar(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      await alert({
        title: "Change avatar",
        message: "Select an image file",
        confirmText: "OK",
      });
      return;
    }

    try {
      setUploading(true);
      const { avatarUrl: newUrl } = await updateAvatarApi({ file });
      dispatch(setUser({ ...(user || {}), avatarUrl: newUrl }));
      setOpenAvatar(false);
      clearModalParam();
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
      await alert({
        title: "Avatar updated",
        message: "Your avatar was changed successfully.",
        confirmText: "OK",
      });
    } catch (err) {
      await alert({
        title: "Upload failed",
        message: err?.error || err?.message || "Failed to upload avatar",
        confirmText: "OK",
      });
    } finally {
      setUploading(false);
      setFileName("");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
  }

  async function fetchAllPosts({ status = "active", pageSize = 100 } = {}) {
    let page = 1;
    const all = [];

    while (true) {
      const data = await fetchPostsApi({
        page,
        limit: pageSize,
        sort: "likes",
        order: "desc",
        status,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      all.push(...items);
      if (items.length < pageSize) break;
      page += 1;
      if (page > 20) break;
    }
    return all;
  }

  async function countCommentsWithConcurrency(postIds, concurrency = 5) {
    let idx = 0;
    let sum = 0;

    async function worker() {
      while (idx < postIds.length) {
        const myIdx = idx++;
        const id = postIds[myIdx];
        try {
          const list = await getPostCommentsApi(id);
          sum += Array.isArray(list) ? list.length : 0;
        } catch {}
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, postIds.length) },
      () => worker()
    );
    await Promise.all(workers);
    return sum;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!user?.id && !user?.login) return;

      setStatsLoading(true);
      setStatsError(null);
      try {
        const all = await fetchAllPosts({ status: "active", pageSize: 100 });

        const mine = all.filter(
          (p) =>
            (user?.id && p.authorId === user.id) ||
            (user?.login && p.authorLogin === user.login)
        );

        const likes = mine.reduce(
          (acc, p) => acc + (Number(p.likesCount) || 0),
          0
        );
        const dislikes = mine.reduce(
          (acc, p) => acc + (Number(p.dislikesCount) || 0),
          0
        );

        let comments = 0;
        const needFetchIds = [];
        for (const p of mine) {
          if (p.commentsCount != null) {
            comments += Number(p.commentsCount) || 0;
          } else {
            needFetchIds.push(p.id);
          }
        }

        if (needFetchIds.length > 0) {
          const add = await countCommentsWithConcurrency(needFetchIds, 5);
          comments += add;
        }

        if (!cancelled) {
          setStats({ likes, dislikes, comments, rating: user?.rating ?? 0 });
        }
      } catch (e) {
        if (!cancelled) {
          setStatsError(e?.message || "Failed to load stats");
          setStats((s) => ({ ...s, likes: 0, dislikes: 0, comments: 0 }));
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.login]);

  async function onSendPasswordReset() {
    try {
      if (!user?.email) {
        await alert({
          title: "Change password",
          message: "No e-mail bound to this account",
          confirmText: "OK",
        });
        return;
      }
      await requestPasswordResetApi(user.email);
      await alert({
        title: "Email sent",
        message: "Password reset request has been sent to your email.",
        confirmText: "OK",
      });
    } catch (e) {
      await alert({
        title: "Failed",
        message: e?.message || "Failed to send password reset email",
        confirmText: "OK",
      });
    }
  }

  async function onDeleteAccount() {
    if (!user?.id) return;

    const ok = await confirm({
      title: "Delete account",
      message:
        "Delete your account permanently?\n\nThis action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
    });
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteUserApi(user.id);

      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      dispatch(setUser(null));

      await alert({
        title: "Account deleted",
        message: "Your account has been removed.",
        confirmText: "OK",
      });

      window.location.replace("/login");
    } catch (e) {
      await alert({
        title: "Delete failed",
        message: e?.error || e?.message || "Failed to delete account",
        confirmText: "OK",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="profile-page">
      {/* центральний контейнер (1 колонка) */}
      <div className="profile-layout">
        {/* Верхня секція: картка профілю */}
        <section className="profile-card">
          {/* Аватар */}
          <aside className="avatarBox" aria-label="Avatar">
            {avatarUrl ? (
              <img className="avatarImg" src={avatarUrl} alt="User avatar" />
            ) : (
              <div className="avatarStub" aria-hidden>
                {(user?.fullName || user?.login || "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}

            <button
              type="button"
              className="avatarEditBtn"
              aria-label="Change avatar"
              title="Change avatar"
              onClick={() => setOpenAvatar(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 7l1.2-2a1 1 0 0 1 .9-.5h2.8a1 1 0 0 1 .9.5L16 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle
                  cx="12"
                  cy="14"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          </aside>

          {/* Інфо */}
          <section className="info">
            <div className="row nameRow">
              <h1 className="fullName" title={fullName0}>
                {user?.fullName || user?.login || "User"}
              </h1>
              <button
                type="button"
                className="editBtn"
                aria-label="Edit name"
                title="Edit name"
                onClick={() => {
                  setFullName(user?.fullName || "");
                  setOpenName(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 20l4.5-1 9.6-9.6a1.5 1.5 0 0 0 0-2.1L14.7 3.9a1.5 1.5 0 0 0-2.1 0L3 13.5 2 18l2 2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M13 5l6 6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            <div className="row">
              <label className="label">Login</label>
              <div className="value">@{login}</div>
            </div>

            <div className="row">
              <label className="label">E-mail</label>
              <div className="value">{email}</div>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat__label">Likes</div>
                <div className="stat__val">
                  {statsLoading ? "…" : stats.likes}
                </div>
              </div>
              <div className="stat">
                <div className="stat__label">Comments</div>
                <div className="stat__val">
                  {statsLoading ? "…" : stats.comments}
                </div>
              </div>
              <div className="stat">
                <div className="stat__label">Dislikes</div>
                <div className="stat__val">
                  {statsLoading ? "…" : stats.dislikes}
                </div>
              </div>
              <div className="stat">
                <div className="stat__label">Rating</div>
                <div className="stat__val">{stats.rating}</div>
              </div>
            </div>

            {statsError && (
              <div
                role="alert"
                style={{ marginTop: 8, fontSize: 13, color: "#fda4af" }}
              >
                ⚠ {String(statsError)}
              </div>
            )}

            <div className="actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={onSendPasswordReset}
              >
                Change password
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={onDeleteAccount}
                disabled={deleting}
                title="Delete account permanently"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </section>

        {/* Нижня секція: фільтри/таби/список постів */}
        <section className="profile-right">
          <ProfileBottom userId={user?.id} userLogin={user?.login} />
        </section>
      </div>

      {/* ───────── Modals ───────── */}

      {/* Edit Name */}
      <Modal
        open={openName}
        onClose={() => {
          setOpenName(false);
          clearModalParam();
        }}
        title="Edit name"
        width={480}
      >
        <form className="modalForm" onSubmit={submitName}>
          <div className="modalRow">
            <label className="modalLabel" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="modalInput"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="modalActions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOpenName(false);
                clearModalParam();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingName}
            >
              {savingName ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openPassword}
        onClose={() => {
          setOpenPassword(false);
          clearModalParam();
        }}
        title="Change password"
        width={520}
      >
        <form className="modalForm" onSubmit={(e) => e.preventDefault()}>
          <div className="modalRow">
            <label className="modalLabel" htmlFor="pass1">
              Current password
            </label>
            <input
              id="pass1"
              className="modalInput"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div className="modalRow">
            <label className="modalLabel" htmlFor="pass2">
              New password
            </label>
            <input
              id="pass2"
              className="modalInput"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <div className="modalRow">
            <label className="modalLabel" htmlFor="pass3">
              Confirm new password
            </label>
            <input
              id="pass3"
              className="modalInput"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <div className="modalActions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOpenPassword(false);
                clearModalParam();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled>
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Avatar */}
      <Modal
        open={openAvatar}
        onClose={() => {
          setOpenAvatar(false);
          clearModalParam();
          setFileName("");
        }}
        title="Change avatar"
        width={520}
      >
        <form className="modalForm" onSubmit={submitAvatar}>
          <div className="modalRow">
            <label className="modalLabel" htmlFor="avatarFile">
              Select image
            </label>

            <div className="modalFile-wrapper">
              <input
                id="avatarFile"
                className="modalFile-input"
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleFileChange}
              />
              <label htmlFor="avatarFile" className="modalFile-btn">
                Browse...
              </label>
              <span
                className={`modalFile-name ${fileName ? "is-selected" : ""}`}
              >
                {fileName || "No file selected."}
              </span>
            </div>
          </div>
          <div className="modalActions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOpenAvatar(false);
                clearModalParam();
                setFileName("");
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
