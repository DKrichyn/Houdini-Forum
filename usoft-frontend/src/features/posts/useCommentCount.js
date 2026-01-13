import { useEffect, useRef, useState } from "react";
import { getPostCommentsApi } from "./api";

const cache = new Map();
const inflight = new Map();

export default function useCommentCount(postId, enabled = true) {
  const [count, setCount] = useState(() =>
    cache.has(postId) ? cache.get(postId) : null
  );
  const [loading, setLoading] = useState(() => !cache.has(postId) && !!enabled);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(() =>
    cache.has(postId) ? false : !!enabled
  );

  useEffect(() => {
    if (!enabled) return;
    if (cache.has(postId)) {
      setCount(cache.get(postId));
      setLoading(false);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [postId, enabled]);

  useEffect(() => {
    if (!enabled || !shouldLoad || cache.has(postId)) return;

    setLoading(true);
    setError(null);

    let p = inflight.get(postId);
    if (!p) {
      p = getPostCommentsApi(postId)
        .then((list) => {
          const n = Array.isArray(list) ? list.length : 0;
          cache.set(postId, n);
          return n;
        })
        .finally(() => inflight.delete(postId));
      inflight.set(postId, p);
    }

    p.then((n) => setCount(n))
      .catch((e) => setError(e?.message || "Failed to load comments"))
      .finally(() => setLoading(false));
  }, [postId, enabled, shouldLoad]);

  return { ref, count, loading, error };
}
