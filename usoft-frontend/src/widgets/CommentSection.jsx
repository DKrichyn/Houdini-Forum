import React from "react";
import { getPostComments } from "../features/comments/api";
import { getUserById } from "../features/users/api";

export default function CommentSection({ postId }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [comments, setComments] = React.useState([]);
  const [userMap, setUserMap] = React.useState({});

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await getPostComments(postId);
        if (cancelled) return;

        setComments(items || []);

        const ids = Array.from(
          new Set((items || []).map((c) => c.authorId).filter(Boolean))
        );
        if (ids.length) {
          const pairs = await Promise.all(
            ids.map(async (uid) => {
              try {
                const u = await getUserById(uid);
                return [uid, u];
              } catch {
                return [uid, null];
              }
            })
          );
          if (cancelled) return;

          const map = Object.fromEntries(pairs);
          setUserMap(map);
        } else {
          setUserMap({});
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.error || e?.message || "Failed to load comments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (loading) return <div>Loading comments…</div>;
  if (error)
    return <div style={{ color: "crimson" }}>Error: {String(error)}</div>;

  return (
    <div className="comments">
      {comments.length === 0 ? (
        <div>No comments yet</div>
      ) : (
        comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            user={userMap[c.authorId] || null}
          />
        ))
      )}
    </div>
  );
}

function CommentItem({ comment, user }) {
  const name =
    user?.fullName || user?.login || `User #${comment.authorId ?? "—"}`;
  const avatar = user?.avatarUrl;

  return (
    <div
      className="comment"
      style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#ddd",
            overflow: "hidden",
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
        <strong>{name}</strong>
        <span style={{ color: "#999", fontSize: 12 }}>#{comment.id}</span>
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{comment.content}</div>
    </div>
  );
}
