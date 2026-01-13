import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectAuthToken,
  selectIsAuthed,
  selectAuthUser,
} from "../features/auth/selectors";
import { listCategoriesApi, createPostApi } from "../features/posts/api";
import "./CreatePostPage.css";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const token = useSelector(selectAuthToken);
  const isAuthed = useSelector(selectIsAuthed);
  const me = useSelector(selectAuthUser);

  useEffect(() => {
    if (!isAuthed) navigate("/login");
  }, [isAuthed, navigate]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsErr, setCatsErr] = useState(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCatsLoading(true);
        setCatsErr(null);
        const list = await listCategoriesApi();
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!abort) setCatsErr(e.message || "Failed to load categories");
      } finally {
        if (!abort) setCatsLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  function toggleCat(id) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const valid = useMemo(() => {
    const t = title.trim();
    const c = content.trim();
    return t.length >= 3 && c.length >= 3 && selectedCats.length >= 1;
  }, [title, content, selectedCats.length]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) {
      navigate("/login");
      return;
    }
    if (!valid) return;

    try {
      setSubmitBusy(true);
      setSubmitErr(null);
      const body = {
        title: title.trim(),
        content: content.trim(),
        categories: selectedCats,
      };
      const created = await createPostApi(body, token);

      const hydrated = {
        ...created,
        authorId: created.authorId ?? me?.id,
        authorLogin: created.authorLogin ?? me?.login,
        authorFullName: created.authorFullName ?? me?.fullName,
      };

      navigate(`/posts/${hydrated.id}`, { state: { post: hydrated } });
    } catch (e2) {
      setSubmitErr(e2?.message || "Failed to create post");
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div className="cpg">
      <form className="cpg__card" onSubmit={onSubmit}>
        <h1 className="cpg__title">Create a new post</h1>

        <label className="cpg__field">
          <span className="cpg__label">Title</span>
          <input
            className="cpg__input"
            type="text"
            placeholder="Enter title (min 3 chars)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            required
          />
        </label>

        <label className="cpg__field">
          <span className="cpg__label">Content</span>
          <textarea
            className="cpg__textarea"
            placeholder="Write your post (min 3 chars)"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </label>

        <div className="cpg__field">
          <div className="cpg__label">Categories</div>
          {catsLoading && <div className="cpg__hint">Loading categories…</div>}
          {catsErr && <div className="cpg__err">⚠ {catsErr}</div>}

          {!catsLoading && !catsErr && (
            <div className="cpg__cats">
              {cats.length === 0 && (
                <div className="cpg__hint">No categories yet.</div>
              )}
              {cats.map((cat) => (
                <label
                  key={cat.id}
                  className={`cpg__chip ${
                    selectedCats.includes(cat.id) ? "is-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                  />
                  <span>#{cat.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Помилка сабміту */}
        {submitErr && <div className="cpg__err">⚠ {submitErr}</div>}

        <div className="cpg__actions">
          <button
            type="button"
            className="cpg-btn"
            onClick={() => navigate(-1)}
            disabled={submitBusy}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="cpg-btn cpg-btn--primary"
            disabled={!valid || submitBusy}
            title={
              !valid
                ? "Fill title, content and choose at least 1 category"
                : "Publish"
            }
          >
            {submitBusy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
