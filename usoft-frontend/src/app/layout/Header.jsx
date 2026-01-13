import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectAuthUser, selectIsAuthed } from "../../features/auth/selectors";
import { logout } from "../../features/auth/actions";
import CategoryManagerModal from "../../admin/CategoryManagerModal";
import UsersManagerModal from "../../admin/UsersManagerModal";
import CommandSearch from "../../shared/CommandSearch";
import "./Header.css";

function getInitials(user) {
  const src = user?.fullName || user?.login || "G";
  const parts = String(src).trim().split(/\s+/);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + (b || "")).slice(0, 2) || "G";
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector(selectAuthUser);
  const isAuthed = useSelector(selectIsAuthed);
  const isAdmin = user?.role === "admin";

  const isAuthRoute = ["/login", "/register", "/verify-email"].includes(
    pathname
  );
  const isHome = pathname === "/";

  const showSearch = !isAuthRoute;

  const searchLocked = showSearch && !isAuthed;

  const showProfile = !isAuthRoute && isAuthed;

  const showAuthButtons = isHome && !isAuthed;

  const username = user?.login ? `@${user.login}` : "@guest";
  const role = user?.role || "guest";
  const email = user?.email || "guest@example.com";
  const initials = getInitials(user);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showUserMgr, setShowUserMgr] = useState(false);

  const toggleMenu = () => setOpen((v) => !v);
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      const t = e.target;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onSignOut = () => {
    dispatch(logout());
    setOpen(false);
    navigate("/login");
  };

  return (
    <header className="main-header">
      <div className="header__container">
        <div className="header__left">
          <Link to="/" className="brand">
            Houdini
          </Link>
        </div>
        <div
          className={`header__center ${showSearch ? "" : "is-hidden"} ${
            searchLocked ? "is-locked" : ""
          }`}
        >
          {showSearch && (
            <>
              <CommandSearch placeholder="Jump to… (Ctrl/⌘+K)" />
              {searchLocked && (
                <button
                  type="button"
                  className="search-lock"
                  title="Login to use search"
                  onClick={() => navigate("/login")}
                  aria-label="Search is locked. Login to use."
                >
                  🔒 Login to search
                </button>
              )}
            </>
          )}
        </div>

        <div className="header__right">
          {showProfile && (
            <div className="profile" ref={triggerRef} onClick={toggleMenu}>
              <div className="profile__info">
                <div className="profile__username">{username}</div>
                <div className="profile__role">{role}</div>
              </div>

              <div className="profile__avatar">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} id="ava" alt="avatar" />
                ) : (
                  <div className="avatar-fallback" aria-hidden>
                    {initials}
                  </div>
                )}
              </div>

              {open && (
                <div
                  className="account-menu"
                  ref={menuRef}
                  role="dialog"
                  aria-label="Account menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="account-menu__close"
                    aria-label="Close"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                    }}
                  >
                    ✕
                  </button>

                  <div className="account-menu__email">{email}</div>

                  <div className="account-menu__avatarWrap">
                    {user?.avatarUrl ? (
                      <img
                        className="account-menu__avatar"
                        src={user.avatarUrl}
                        alt="avatar"
                      />
                    ) : (
                      <div className="account-menu__avatar account-menu__avatar--fallback">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="account-menu__hello">
                    Hello,{" "}
                    <strong>{user?.fullName || user?.login || "guest"}</strong>!
                  </div>

                  <nav className="am-list" aria-label="Account actions">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className="am-item am-item--admin"
                          onClick={() => {
                            setShowCatMgr(true);
                            closeMenu();
                          }}
                        >
                          <span className="am-ic" aria-hidden>
                            🏷️
                          </span>
                          <span className="am-text">
                            <span className="am-title">Category manager</span>
                            <span className="am-sub">
                              Create, edit, delete categories
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="am-item am-item--admin"
                          onClick={() => {
                            setShowUserMgr(true);
                            closeMenu();
                          }}
                        >
                          <span className="am-ic" aria-hidden>
                            👥
                          </span>
                          <span className="am-text">
                            <span className="am-title">Users manager</span>
                            <span className="am-sub">
                              View and manage users
                            </span>
                          </span>
                        </button>

                        <div
                          className="am-divider"
                          role="separator"
                          aria-hidden
                        />
                      </>
                    )}

                    <button
                      type="button"
                      className="am-item am-item--primary"
                      onClick={() => {
                        closeMenu();
                        navigate("/posts/new");
                      }}
                    >
                      <span className="am-ic" aria-hidden>
                        ➕
                      </span>
                      <span className="am-text">
                        <span className="am-title">Create post</span>
                        <span className="am-sub">Share something great</span>
                      </span>
                    </button>

                    <div className="am-divider" role="separator" aria-hidden />

                    <div className="am-row">
                      <button
                        type="button"
                        className="am-item"
                        onClick={() => {
                          closeMenu();
                          navigate("/profile");
                        }}
                      >
                        <span className="am-ic" aria-hidden>
                          👤
                        </span>
                        <span className="am-text">
                          <span className="am-title">Profile</span>
                          <span className="am-sub">View and edit profile</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        className="am-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSignOut();
                        }}
                      >
                        <span className="am-ic" aria-hidden>
                          🚪
                        </span>
                        <span className="am-text">
                          <span className="am-title">Sign out</span>
                          <span className="am-sub">Log out of account</span>
                        </span>
                      </button>
                    </div>
                  </nav>
                </div>
              )}
            </div>
          )}

          {showAuthButtons && (
            <div className="auth-buttons">
              <button className="auth-btn" onClick={() => navigate("/login")}>
                Login
              </button>
              <button
                className="auth-btn auth-btn--primary"
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
      <CategoryManagerModal
        open={showCatMgr}
        onClose={() => setShowCatMgr(false)}
      />
      <UsersManagerModal
        open={showUserMgr}
        onClose={() => setShowUserMgr(false)}
      />
    </header>
  );
}
