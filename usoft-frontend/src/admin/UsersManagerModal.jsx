import React, { useEffect, useMemo, useState } from "react";
import Modal from "../shared/ui/Modal";
import {
  listUsersAdmin,
  createUserAdmin,
  deleteUserAdmin,
} from "../features/users/api";
import UserEditModal from "./UserEditModal";
import "./UsersManagerModal.css";

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

export default function UsersManagerModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [cLogin, setCLogin] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cFull, setCFull] = useState("");
  const [cPass, setCPass] = useState("");
  const [cRole, setCRole] = useState("user");
  const [busyCreate, setBusyCreate] = useState(false);

  const [editUser, setEditUser] = useState(null);

  const [busyDeleteId, setBusyDeleteId] = useState(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const list = await listUsersAdmin();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.error || e?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setCreateOpen(false);
    refresh();
  }, [open]);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return users;
    if (nq.startsWith("@")) {
      const needle = nq.slice(1);
      return users.filter((u) => normalize(u.login).includes(needle));
    }
    return users.filter(
      (u) =>
        normalize(u.login).includes(nq) || normalize(u.fullName).includes(nq)
    );
  }, [q, users]);

  async function removeUser(id) {
    if (!id) return;
    if (!window.confirm("Delete this user permanently?")) return;
    setBusyDeleteId(id);
    try {
      await deleteUserAdmin(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (editUser?.id === id) setEditUser(null);
    } catch (e) {
      alert(e?.error || e?.message || "Failed to delete user");
    } finally {
      setBusyDeleteId(null);
    }
  }

  async function handleCreate(e) {
    e?.preventDefault?.();
    if (!cLogin.trim() || !cEmail.trim() || !cFull.trim() || !cPass.trim()) {
      alert("Please fill login, email, full name and password");
      return;
    }
    setBusyCreate(true);
    try {
      const created = await createUserAdmin({
        login: cLogin.trim(),
        email: cEmail.trim(),
        fullName: cFull.trim(),
        password: cPass,
        role: cRole || "user",
      });
      setUsers((prev) => [created, ...prev]);
      setCLogin("");
      setCEmail("");
      setCFull("");
      setCPass("");
      setCRole("user");
      setCreateOpen(false);
    } catch (e2) {
      alert(e2?.error || e2?.message || "Failed to create user");
    } finally {
      setBusyCreate(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Users Manager">
        <div className={`um ${createOpen ? "is-creating" : ""}`}>
          <div className="um__toolbar">
            <input
              className="um__search"
              placeholder="Search by @login or full name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="um__create">
              <button
                className="um__btn um__btn--primary"
                type="button"
                onClick={() => setCreateOpen(true)}
              >
                ➕ New user
              </button>
            </div>
          </div>

          <form
            className={`um__createFormPanel ${createOpen ? "is-open" : ""}`}
            onSubmit={handleCreate}
            aria-hidden={!createOpen}
          >
            <div className="um__createGrid">
              <input
                className="um__input"
                placeholder="login"
                value={cLogin}
                onChange={(e) => setCLogin(e.target.value)}
              />
              <input
                className="um__input"
                placeholder="email"
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
              />
              <input
                className="um__input"
                placeholder="full name"
                value={cFull}
                onChange={(e) => setCFull(e.target.value)}
              />
              <input
                className="um__input"
                placeholder="password"
                type="password"
                value={cPass}
                onChange={(e) => setCPass(e.target.value)}
              />
            </div>
            <div className="um__createActions">
              <select
                className="um__input"
                value={cRole}
                onChange={(e) => setCRole(e.target.value)}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                className="um__btn um__btn--primary"
                type="submit"
                disabled={busyCreate}
              >
                {busyCreate ? "Creating…" : "Add"}
              </button>
              <button
                className="um__btn"
                type="button"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>

          {loading && <div className="um__state">Loading users…</div>}
          {err && !loading && (
            <div className="um__state um__state--err">⚠ {String(err)}</div>
          )}
          {!loading && !err && filtered.length === 0 && (
            <div className="um__empty">No users.</div>
          )}

          {!loading && !err && filtered.length > 0 && (
            <div className="um__list">
              {filtered.map((u) => (
                <div className="um__row" key={u.id}>
                  <div className="um__title">
                    <div className="um__line">
                      <span className="um__login">@{u.login}</span>
                      <span className="um__dot">•</span>
                      <span className="um__name">{u.fullName}</span>
                    </div>
                    <div className="um__line um__muted">
                      <span>{u.email}</span>
                      <span className="um__dot">•</span>
                      <span className={`um__role um__role--${u.role}`}>
                        {u.role}
                      </span>
                      {u.emailConfirmed ? (
                        <span className="um__badge">verified</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="um__actions">
                    <button
                      className="um__btn"
                      type="button"
                      onClick={() => setEditUser(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="um__btn um__btn--danger"
                      type="button"
                      onClick={() => removeUser(u.id)}
                      disabled={busyDeleteId === u.id}
                      title="Delete user"
                    >
                      {busyDeleteId === u.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <UserEditModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={(updated) => {
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u))
          );
          setEditUser(null);
        }}
      />
    </>
  );
}
