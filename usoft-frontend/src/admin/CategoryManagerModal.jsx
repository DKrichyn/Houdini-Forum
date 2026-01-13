import React, { useEffect, useMemo, useState } from "react";
import Modal from "../shared/ui/Modal";
import { apiGet, apiPost, apiPatch, apiDelete } from "../shared/lib/apiClient";
import "./CategoryManagerModal.css";

export default function CategoryManagerModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiGet("/api/admin/categories");
      setCats(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.error || e?.message || "Failed to load categories");
      setCats([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cats;
    return cats.filter((c) =>
      String(c.title || "")
        .toLowerCase()
        .includes(s)
    );
  }, [q, cats]);

  async function onCreate(e) {
    e?.preventDefault?.();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const created = await apiPost("/api/admin/categories", { title });
      setCats((prev) => [created, ...prev]);
      setNewTitle("");
    } catch (e2) {
      alert(e2?.error || e2?.message || "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat) {
    setEditId(cat.id);
    setEditTitle(cat.title || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditTitle("");
  }

  async function saveEdit() {
    const title = editTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const updated = await apiPatch(`/api/admin/categories/${editId}`, {
        title,
      });
      setCats((prev) => prev.map((c) => (c.id === editId ? updated : c)));
      cancelEdit();
    } catch (e2) {
      alert(e2?.error || e2?.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function remove(cat) {
    if (!window.confirm(`Delete category "${cat.title}"?`)) return;
    setDeletingId(cat.id);
    try {
      await apiDelete(`/api/admin/categories/${cat.id}`);
      setCats((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e2) {
      alert(e2?.error || e2?.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Category Manager" width={600}>
      {" "}
      <div className="cm">
        <div className="cm__toolbar">
          <input
            className="cm__search"
            type="search"
            placeholder="Search by title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search categories"
          />
          <form className="cm__create" onSubmit={onCreate}>
            <input
              className="cm__input"
              type="text"
              placeholder="New category title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <button
              type="submit"
              className="cm__btn cm__btn--primary"
              disabled={!newTitle.trim() || creating}
              title="Add category"
            >
              {creating ? "Adding…" : "Add"}
            </button>
          </form>
        </div>

        {loading && <div className="cm__state">Loading…</div>}
        {error && !loading && (
          <div className="cm__state cm__state--err">⚠ {String(error)}</div>
        )}

        {!loading && !error && (
          <div className="cm__list">
            {filtered.length === 0 && (
              <div className="cm__empty">No categories.</div>
            )}

            {filtered.map((cat) => {
              const isEditing = editId === cat.id;
              return (
                <div key={cat.id} className="cm__row">
                  {!isEditing ? (
                    <>
                      <div className="cm__title">#{cat.title}</div>
                      <div className="cm__actions">
                        <button
                          className="cm__btn"
                          onClick={() => startEdit(cat)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="cm__btn cm__btn--danger"
                          onClick={() => remove(cat)}
                          disabled={deletingId === cat.id}
                          title="Delete"
                        >
                          {deletingId === cat.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="cm__input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                      />
                      <div className="cm__actions">
                        <button
                          className="cm__btn cm__btn--primary"
                          onClick={saveEdit}
                          disabled={!editTitle.trim() || saving}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button className="cm__btn" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
