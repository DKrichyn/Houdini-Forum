import React, { useEffect, useState } from "react";
import Modal from "../shared/ui/Modal";
import { updateUserAdmin } from "../features/users/api";
import "./UserEditModal.css";

export default function UserEditModal({ open, user, onClose, onSaved }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.fullName || "");
    setEmail(user.email || "");
    setRole(user.role || "user");
    setBusy(false);
    setError(null);
  }, [open, user]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
      };
      const updated = await updateUserAdmin(user.id, payload);
      onSaved?.(updated);
    } catch (e2) {
      setError(e2?.error || e2?.message || "Failed to update user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit user @${user?.login ?? ""}`}
    >
      <form className="ue__form" onSubmit={onSubmit}>
        <div className="ue__grid">
          <label className="ue__field">
            <span className="ue__label">Full name</span>
            <input
              className="ue__input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </label>

          <label className="ue__field">
            <span className="ue__label">Email</span>
            <input
              className="ue__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@email.com"
            />
          </label>

          <label className="ue__field ue__field--role">
            <span className="ue__label">Role</span>
            <select
              className="ue__input ue__select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>

        {error && <div className="ue__error">⚠ {error}</div>}

        <div className="ue__actions">
          <button
            type="button"
            className="ue__btn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ue__btn ue__btn--primary"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
