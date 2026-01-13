import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import "./PostDetailsPage.css";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuthToken, selectAuthUser } from "../features/auth/selectors";
import ToggleSwitch from "../shared/ui/ToggleSwitch";
import { useConfirm } from "../shared/ui/ConfirmProvider";
import {
  getPostById,
  getPostCategories,
  listPostComments,
  listPostReactions,
  likePost,
  unlikePost,
  addFavoritePost,
  removeFavoritePost,
  listUserFavorites,
  createComment,
  deleteComment,
  listCommentReactions,
  likeComment,
  unlikeComment,
  updatePostStatus,
} from "../features/posts/postApi";

function normReaction(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "like" || s === "+1" || s === "up" || s === "1") return "like";
  if (s === "dislike" || s === "-1" || s === "down" || s === "0")
    return "dislike";
  return null;
}

function isSoftConflict(err) {
  const s = Number(err?.status);
  return s === 400 || s === 409 || s === 422;
}

function parseReplyAnchor(content = "") {
  const m = content.match(/^@(\d+)\s+/);
  if (!m) return { parentId: null, pure: content };
  const parentId = Number(m[1]);
  const pure = content.slice(m[0].length);
  return { parentId, pure };
}

async function patchCommentStatus(commentId, status, token) {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
      "Cache-Control": "no-store",
    },
    cache: "no-store",
    body: JSON.stringify({ status }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
const postAuthorCache = new Map();
export default function PostDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const token = useSelector(selectAuthToken);
  const me = useSelector(selectAuthUser);
  const isAdmin = me?.role === "admin";
  const { alert, confirm } = useConfirm();
  const statePost = location.state?.post;

  const [post, setPost] = useState(statePost || null);
  const [loading, setLoading] = useState(!statePost);
  const [error, setError] = useState(null);

  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);

  const [likes, setLikes] = useState(statePost?.likesCount ?? 0);
  const [dislikes, setDislikes] = useState(statePost?.dislikesCount ?? 0);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentTree, setCommentTree] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  const [replyTo, setReplyTo] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const taRef = useRef(null);

  const [myReaction, setMyReaction] = useState(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  const [cRx, setCRx] = useState({});

  const [userCache, setUserCache] = useState({});

  const [postStatus, setPostStatus] = useState(statePost?.status ?? "active");
  const [statusSaving, setStatusSaving] = useState(false);

  const postId = useMemo(() => Number(id), [id]);

  const isPostActive = postStatus === "active";

  const onTAInput = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  function displayAuthor(c) {
    if (c.authorFullName && c.authorFullName.trim()) return c.authorFullName;
    if (c.authorLogin && c.authorLogin.trim()) return c.authorLogin;
    if (me?.id && c.authorId === me.id) {
      return me.fullName?.trim() || me.login?.trim() || "You";
    }
    const cached = userCache[c.authorId];
    if (cached)
      return (
        cached.fullName?.trim() ||
        cached.login?.trim() ||
        `User #${c.authorId ?? "—"}`
      );
    return `User #${c.authorId ?? "—"}`;
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      if (statePost) {
        setPostStatus(statePost.status ?? "active");
        return;
      }
      try {
        setLoading(true);
        const data = await getPostById(postId, token);
        if (!abort) {
          setPost(data);
          setLikes(data.likesCount ?? 0);
          setDislikes(data.dislikesCount ?? 0);
          setPostStatus(data.status ?? "active");
        }
      } catch (e) {
        if (!abort) setError(e?.message || "Failed to load post");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [postId, statePost, token]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCatsLoading(true);
        const list = await getPostCategories(postId, token);
        if (!abort) setCats(Array.isArray(list) ? list : []);
      } catch {
        if (!abort) setCats([]);
      } finally {
        if (!abort) setCatsLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [postId, token]);

  useEffect(() => {
    if (!comments?.length || !me?.id) return;

    let cancelled = false;

    async function preloadMyCommentReactions(concurrency = 5) {
      const targets = comments
        .map((c) => c.id)
        .filter((cid) => {
          const cell = cRx[cid];
          return !cell || !cell.initialized;
        });

      if (!targets.length) return;

      let cursor = 0;

      async function worker() {
        while (cursor < targets.length && !cancelled) {
          const myIdx = cursor++;
          const cid = targets[myIdx];
          try {
            const list = await listCommentReactions(cid, token);
            const likeCount = list.filter(
              (x) => normReaction(x.type) === "like"
            ).length;
            const dislikeCount = list.filter(
              (x) => normReaction(x.type) === "dislike"
            ).length;
            const mine = list.find((x) => Number(x.authorId) === Number(me.id));
            const myRx = normReaction(mine?.type);

            if (!cancelled) {
              setCRx((prev) => ({
                ...prev,
                [cid]: {
                  likes: likeCount,
                  dislikes: dislikeCount,
                  myReaction: myRx,
                  loading: false,
                  initialized: true,
                },
              }));
            }
          } catch {
            if (!cancelled) {
              setCRx((prev) => {
                const cell = prev[cid] || {
                  likes: 0,
                  dislikes: 0,
                  myReaction: null,
                  loading: false,
                };
                return {
                  ...prev,
                  [cid]: { ...cell, initialized: true, loading: false },
                };
              });
            }
          }
        }
      }

      const n = Math.min(concurrency, targets.length);
      await Promise.all(Array.from({ length: n }, () => worker()));
    }

    preloadMyCommentReactions(5);

    return () => {
      cancelled = true;
    };
  }, [comments, me?.id, token]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!me?.id || !token) return;
      try {
        const favs = await listUserFavorites(me.id, token);
        if (!abort && Array.isArray(favs))
          setIsFav(!!favs.find((p) => p.id === postId));
      } catch {}
    })();
    return () => {
      abort = true;
    };
  }, [me?.id, token, postId]);

  const buildTree = useCallback(
    (flat) => {
      const normalized = (Array.isArray(flat) ? flat : []).map((c) => {
        const { parentId, pure } = parseReplyAnchor(c.content || "");
        return { ...c, parentId: parentId || null, pureContent: pure };
      });

      if (isAdmin) {
        const mapAll = new Map(normalized.map((c) => [c.id, c]));
        const childrenAll = new Map();
        const rootsAll = [];

        normalized.forEach((c) => {
          const p = c.parentId;
          if (p && mapAll.has(p)) {
            if (!childrenAll.has(p)) childrenAll.set(p, []);
            childrenAll.get(p).push(c);
          } else {
            rootsAll.push(c);
          }
        });

        const tree = rootsAll.map((node) => ({
          node,
          replies: (childrenAll.get(node.id) || []).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          ),
        }));
        return { normalized, tree };
      }

      const myId = Number(me?.id) || null;

      const byId = new Map(normalized.map((c) => [c.id, c]));

      function isInactive(node) {
        return (node.status ?? "active") !== "active";
      }

      function isOwn(node) {
        return myId && Number(node.authorId) === myId;
      }

      function hasHiddenInactiveAncestor(node) {
        let cur = node;
        while (cur && cur.parentId) {
          const p = byId.get(cur.parentId);
          if (!p) break;
          if (isInactive(p)) {
            return true;
          }
          cur = p;
        }
        return false;
      }

      const visible = normalized.filter((c) => {
        const active = !isInactive(c);
        const ownInactive = !active && isOwn(c);
        if (!(active || ownInactive)) return false;
        if (hasHiddenInactiveAncestor(c)) return false;
        return true;
      });

      const visibleById = new Map(visible.map((c) => [c.id, c]));
      const childrenByParent = new Map();
      const roots = [];

      visible.forEach((c) => {
        const p = c.parentId;
        if (p && visibleById.has(p)) {
          if (!childrenByParent.has(p)) childrenByParent.set(p, []);
          childrenByParent.get(p).push(c);
        } else {
          roots.push(c);
        }
      });

      const tree = roots.map((node) => ({
        node,
        replies: (childrenByParent.get(node.id) || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        ),
      }));

      return { normalized: visible, tree };
    },
    [isAdmin, me?.id]
  );

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setCommentsLoading(true);

        let list = [];
        if (isAdmin) {
          list = await listPostComments(postId, token);
        } else if (token && me?.id) {
          list = await listPostComments(postId, token);
        } else {
          let ok = false;
          try {
            const res = await fetch(
              `/api/posts/${postId}/comments?status=active`,
              {
                headers: {
                  Accept: "application/json",
                  "Cache-Control": "no-store",
                  Pragma: "no-cache",
                },
                cache: "no-store",
              }
            );
            if (res.ok) {
              list = await res.json();
              ok = true;
            }
          } catch {}
          if (!ok) list = [];
        }

        if (abort) return;

        const { normalized, tree } = buildTree(list);
        setComments(normalized);
        setCommentTree(tree);
      } catch {
        if (!abort) {
          setComments([]);
          setCommentTree([]);
        }
      } finally {
        if (!abort) setCommentsLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [postId, token, isAdmin, me?.id, buildTree]);

  useEffect(() => {
    if (!comments.length) return;
    const uniqueIds = Array.from(
      new Set(comments.map((c) => c.authorId))
    ).filter((id) => Number.isFinite(Number(id)));

    uniqueIds.forEach((uid) => {
      if (userCache[uid] !== undefined) return;
      (async () => {
        try {
          const res = await fetch(`/api/users/${uid}`, {
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-store",
              Pragma: "no-cache",
            },
            cache: "no-store",
          });
          if (res.ok) {
            const u = await res.json();
            setUserCache((prev) => ({ ...prev, [uid]: u }));
          } else {
            setUserCache((prev) => ({ ...prev, [uid]: null }));
          }
        } catch {
          setUserCache((prev) => ({ ...prev, [uid]: null }));
        }
      })();
    });
  }, [comments, userCache]);

  const refreshReactions = useCallback(async () => {
    try {
      const list = await listPostReactions(postId, token);
      if (!Array.isArray(list)) return;
      const likeCount = list.filter(
        (x) => normReaction(x.type) === "like"
      ).length;
      const dislikeCount = list.filter(
        (x) => normReaction(x.type) === "dislike"
      ).length;
      setLikes(likeCount);
      setDislikes(dislikeCount);
      if (me?.id) {
        const mine = list.find((x) => x.authorId === me.id);
        setMyReaction(normReaction(mine?.type));
      } else {
        setMyReaction(null);
      }
    } catch {}
  }, [postId, token, me?.id]);

  useEffect(() => {
    refreshReactions();
  }, [refreshReactions]);

  useEffect(() => {
    if (!comments.length) return;
    setCRx((prev) => {
      const next = { ...prev };
      for (const c of comments) {
        if (!next[c.id]) {
          next[c.id] = {
            likes: c.likesCount ?? 0,
            dislikes: c.dislikesCount ?? 0,
            myReaction: null,
            loading: false,
            initialized: false,
          };
        }
      }
      return next;
    });
  }, [comments]);

  const [postAuthorName, setPostAuthorName] = useState(
    statePost?.authorFullName?.trim?.() || ""
  );

  useEffect(() => {
    if (!post) return;

    const authorId = post.authorId;
    const inlineFull =
      post.authorFullName && String(post.authorFullName).trim();
    const inlineLogin = post.authorLogin && String(post.authorLogin).trim();

    if (inlineFull) {
      setPostAuthorName(inlineFull);
      return;
    }

    if (!authorId) {
      setPostAuthorName(inlineLogin || "unknown");
      return;
    }

    if (postAuthorCache.has(authorId)) {
      const cached = postAuthorCache.get(authorId);
      setPostAuthorName(
        cached.fullName?.trim() ||
          cached.login?.trim() ||
          inlineLogin ||
          "unknown"
      );
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
        postAuthorCache.set(authorId, {
          fullName: u?.fullName,
          login: u?.login,
        });

        if (!abort) {
          const name =
            (u?.fullName && String(u.fullName).trim()) ||
            (u?.login && String(u.login).trim()) ||
            inlineLogin ||
            "unknown";
          setPostAuthorName(name);
        }
      } catch {
        if (!abort) setPostAuthorName(inlineLogin || "unknown");
      }
    })();

    return () => {
      abort = true;
    };
  }, [post]);

  async function ensureCommentMyReaction(cid) {
    setCRx((prev) => {
      const cell = prev[cid];
      if (!cell || cell.initialized) return prev;
      return { ...prev, [cid]: { ...cell, loading: true } };
    });
    try {
      const list = await listCommentReactions(cid, token);
      const likeCount = list.filter(
        (x) => normReaction(x.type) === "like"
      ).length;
      const dislikeCount = list.filter(
        (x) => normReaction(x.type) === "dislike"
      ).length;
      const mine = me?.id ? list.find((x) => x.authorId === me.id) : null;
      const myRx = normReaction(mine?.type);

      setCRx((prev) => ({
        ...prev,
        [cid]: {
          likes: likeCount,
          dislikes: dislikeCount,
          myReaction: myRx,
          loading: false,
          initialized: true,
        },
      }));
    } catch {
      setCRx((prev) => {
        const cell = prev[cid];
        if (!cell) return prev;
        return {
          ...prev,
          [cid]: { ...cell, loading: false, initialized: true },
        };
      });
    }
  }

  async function onTogglePostReaction(type) {
    if (!isPostActive) {
      await alert({
        title: "Post inactive",
        message: "You cannot react to inactive posts",
        confirmText: "OK",
      });
      return;
    }
    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to react to posts.",
        confirmText: "OK",
      });
      return;
    }

    if (reactionLoading) return;

    setReactionLoading(true);
    const prev = { likes, dislikes, myReaction };

    if (myReaction === type) {
      if (type === "like") setLikes((v) => Math.max(0, v - 1));
      else setDislikes((v) => Math.max(0, v - 1));
      setMyReaction(null);
      try {
        await unlikePost(postId, token);
      } catch (e) {
        if (isSoftConflict(e)) {
          await refreshReactions();
        } else {
          setLikes(prev.likes);
          setDislikes(prev.dislikes);
          setMyReaction(prev.myReaction);
          alert(e?.message || "Failed to undo reaction");
        }
      } finally {
        setReactionLoading(false);
        await refreshReactions();
      }
      return;
    }

    if (myReaction === null) {
      if (type === "like") setLikes((v) => v + 1);
      else setDislikes((v) => v + 1);
      setMyReaction(type);
      try {
        await likePost(postId, type, token);
      } catch (e) {
        if (isSoftConflict(e)) {
          await refreshReactions();
        } else {
          setLikes(prev.likes);
          setDislikes(prev.dislikes);
          setMyReaction(prev.myReaction);
          alert(e?.message || "Failed to set reaction");
        }
      } finally {
        setReactionLoading(false);
        await refreshReactions();
      }
      return;
    }

    if (myReaction === "like") setLikes((v) => Math.max(0, v - 1));
    else setDislikes((v) => Math.max(0, v - 1));
    if (type === "like") setLikes((v) => v + 1);
    else setDislikes((v) => v + 1);
    setMyReaction(type);
    try {
      await unlikePost(postId, token);
      await likePost(postId, type, token);
    } catch (e) {
      if (isSoftConflict(e)) {
        await refreshReactions();
      } else {
        setLikes(prev.likes);
        setDislikes(prev.dislikes);
        setMyReaction(prev.myReaction);
        alert(e?.message || "Failed to switch reaction");
      }
    } finally {
      setReactionLoading(false);
      await refreshReactions();
    }
  }

  async function onToggleCommentReaction(cid, type) {
    if (!isPostActive) {
      await alert({
        title: "Post inactive",
        message: "You cannot react while post is inactive",
        confirmText: "OK",
      });
      return;
    }
    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to react to comments.",
        confirmText: "OK",
      });
      return;
    }

    if (!cRx[cid]?.initialized) {
      await ensureCommentMyReaction(cid);
    }
    setCRx((prev) => {
      const cell = prev[cid];
      if (!cell) return prev;
      if (cell.loading) return prev;
      return { ...prev, [cid]: { ...cell, loading: true } };
    });

    const prev = cRx[cid];

    if (prev?.myReaction === type) {
      setCRx((p) => {
        const cell = p[cid];
        const likes =
          type === "like" ? Math.max(0, cell.likes - 1) : cell.likes;
        const dislikes =
          type === "dislike" ? Math.max(0, cell.dislikes - 1) : cell.dislikes;
        return { ...p, [cid]: { ...cell, likes, dislikes, myReaction: null } };
      });
      try {
        await unlikeComment(cid, token);
      } catch (e) {
        if (isSoftConflict(e)) {
          await ensureCommentMyReaction(cid);
        } else {
          setCRx((p) => ({ ...p, [cid]: prev }));
          alert(e?.message || "Failed to undo reaction");
        }
      } finally {
        await ensureCommentMyReaction(cid);
      }
      return;
    }

    if (!prev?.myReaction) {
      setCRx((p) => {
        const cell = p[cid];
        const likes = type === "like" ? cell.likes + 1 : cell.likes;
        const dislikes = type === "dislike" ? cell.dislikes + 1 : cell.dislikes;
        return { ...p, [cid]: { ...cell, likes, dislikes, myReaction: type } };
      });
      try {
        await likeComment(cid, type, token);
      } catch (e) {
        if (isSoftConflict(e)) {
          await ensureCommentMyReaction(cid);
        } else {
          setCRx((p) => ({ ...p, [cid]: prev }));
          alert(e?.message || "Failed to set reaction");
        }
      } finally {
        await ensureCommentMyReaction(cid);
      }
      return;
    }

    setCRx((p) => {
      const cell = p[cid];
      const likes =
        cell.myReaction === "like" ? Math.max(0, cell.likes - 1) : cell.likes;
      const dislikes =
        cell.myReaction === "dislike"
          ? Math.max(0, cell.dislikes - 1)
          : cell.dislikes;
      const likes2 = type === "like" ? likes + 1 : likes;
      const dislikes2 = type === "dislike" ? dislikes + 1 : dislikes;
      return {
        ...p,
        [cid]: {
          ...cell,
          likes: likes2,
          dislikes: dislikes2,
          myReaction: type,
        },
      };
    });
    try {
      await unlikeComment(cid, token);
      await likeComment(cid, type, token);
    } catch (e) {
      if (isSoftConflict(e)) {
        await ensureCommentMyReaction(cid);
      } else {
        setCRx((p) => ({ ...p, [cid]: prev }));
        alert(e?.message || "Failed to switch reaction");
      }
    } finally {
      await ensureCommentMyReaction(cid);
    }
  }

  async function onToggleFavorite() {
    if (!isPostActive) {
      await alert({
        title: "Post inactive",
        message: "You cannot add inactive posts to favorites.",
        confirmText: "OK",
      });
      return;
    }
    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to manage favorites.",
        confirmText: "OK",
      });
      return;
    }

    try {
      setFavLoading(true);
      if (isFav) {
        await removeFavoritePost(postId, token);
        setIsFav(false);
      } else {
        await addFavoritePost(postId, token);
        setIsFav(true);
      }
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setFavLoading(false);
    }
  }

  async function onSubmitComment(e) {
    e.preventDefault();
    if (!isPostActive) {
      alert("Post is inactive");
      return;
    }
    if (!token) {
      alert("Please login to comment");
      return;
    }
    const text = newComment.trim();
    if (!text) return;

    try {
      setCommentSending(true);
      setCommentError(null);

      const payloadContent = replyTo ? `@${replyTo.id} ${text}` : text;
      const created = await createComment(postId, payloadContent, token);

      const { parentId, pure } = parseReplyAnchor(created.content || "");
      const createdExt = {
        ...created,
        parentId: parentId || null,
        pureContent: pure,
      };

      setComments((prev) => [createdExt, ...prev]);
      const { normalized, tree } = buildTree([createdExt, ...comments]);
      setComments(normalized);
      setCommentTree(tree);

      setNewComment("");
      setReplyTo(null);
      if (taRef.current) {
        taRef.current.value = "";
        taRef.current.style.height = "auto";
      }
    } catch (e2) {
      setCommentError(e2?.message || "Failed to add comment");
    } finally {
      setCommentSending(false);
    }
  }

  function onCommentKeyDown(e) {
    const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";
    if (isCtrlEnter) onSubmitComment(e);
  }

  async function onDeleteComment(c) {
    if (!token) {
      alert("Please login");
      return;
    }
    const canDelete = (me?.id && c.authorId === me.id) || me?.role === "admin";
    if (!canDelete) {
      alert("You cannot delete this comment");
      return;
    }
    const ok = await confirm({
      title: "Delete comment",
      message: "Are you sure you want to delete this comment?",
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
    });
    if (!ok) return;

    const prevTree = commentTree;
    const prevList = comments;

    const filteredList = prevList.filter((x) => x.id !== c.id);
    const filteredTree = prevTree
      .map((group) => {
        if (group.node.id === c.id) return null;
        const replies = group.replies.filter((r) => r.id !== c.id);
        return { ...group, replies };
      })
      .filter(Boolean);

    setComments(filteredList);
    setCommentTree(filteredTree);

    try {
      await deleteComment(c.id, token);
    } catch (e) {
      setComments(prevList);
      setCommentTree(prevTree);
      await alert({
        title: "Error",
        message: e?.message || "Failed to delete comment",
        confirmText: "OK",
      });
    }
  }

  async function onToggleCommentStatus(commentId, nextActive) {
    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to change comment status.",
        confirmText: "OK",
      });
      return;
    }

    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    const isAuthor = !!(me?.id && target.authorId === me.id);

    const currentlyActive = (target.status ?? "active") === "active";
    const turningOff = currentlyActive && nextActive === false;

    if (!isAdmin) {
      if (!(isAuthor && turningOff)) {
        await alert({
          title: "Not allowed",
          message: "You cannot change this comment status.",
          confirmText: "OK",
        });

        return;
      }
    }

    const newStatus = nextActive ? "active" : "inactive";

    const before = comments;
    const after = before.map((c) =>
      c.id === commentId ? { ...c, status: newStatus } : c
    );
    const { normalized, tree } = buildTree(after);
    setComments(normalized);
    setCommentTree(tree);

    try {
      await patchCommentStatus(commentId, newStatus, token);
    } catch (e) {
      const rb = buildTree(before);
      setComments(rb.normalized);
      setCommentTree(rb.tree);
      await alert({
        title: "Error",
        message: e?.message || "Failed to change comment status",
        confirmText: "OK",
      });
    }
  }

  async function onTogglePostStatus(nextActive) {
    if (!token) {
      await alert({
        title: "Login required",
        message: "Please login to change post status.",
        confirmText: "OK",
      });
      return;
    }
    if (!isAdmin) {
      await alert({
        title: "Access denied",
        message: "Only admins can change post status.",
        confirmText: "OK",
      });
      return;
    }

    const prevStatus = postStatus;
    const newStatus = nextActive ? "active" : "inactive";

    try {
      setStatusSaving(true);
      setPostStatus(newStatus);
      setPost((p) => (p ? { ...p, status: newStatus } : p));
      await updatePostStatus(postId, newStatus);
    } catch (e) {
      setPostStatus(prevStatus);
      setPost((p) => (p ? { ...p, status: prevStatus } : p));
      await alert({
        title: "Error",
        message: e?.message || "Failed to update post status",
        confirmText: "OK",
      });
    } finally {
      setStatusSaving(false);
    }
  }

  function toggleCollapsed(parentId) {
    setCollapsed((p) => ({ ...p, [parentId]: !p[parentId] }));
  }

  if (loading)
    return (
      <div className="post-page">
        <div className="post-state">Loading…</div>
      </div>
    );
  if (error)
    return (
      <div className="post-page">
        <div className="post-state post-state--err">⚠ {String(error)}</div>
      </div>
    );
  if (!post)
    return (
      <div className="post-page">
        <div className="post-state">No data.</div>
      </div>
    );

  const { title, content, authorLogin, authorFullName, authorId, createdAt } =
    post;

  return (
    <div className="post-page">
      <article className="post-card">
        <header className="post-head">
          <h1 className="post-title">{title}</h1>

          {/* один рядок: ліворуч — мета; праворуч — тумблер (для адміна) */}
          <div className="post-toolbar">
            <div className="post-meta">
              <span className="post-author">{postAuthorName || "unknown"}</span>
              <span className="post-dot">•</span>
              {createdAt &&
                (() => {
                  const dt = new Date(createdAt);
                  const label = dt.toLocaleString('uk-UA', {
                    timeZone: 'Europe/Kyiv',
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <time
                      className="post-date"
                      dateTime={dt.toISOString()}
                      title={dt.toISOString()}
                    >
                      {label}
                    </time>
                  );
                })()}
            </div>

            {isAdmin && (
              <div
                className="post-status-control"
                title="Admin: toggle post status"
              >
                <span
                  className={`post-status-badge ${
                    postStatus === "active" ? "is-ok" : "is-off"
                  }`}
                >
                  {postStatus}
                </span>
                <ToggleSwitch
                  checked={postStatus === "active"}
                  onChange={(next) => onTogglePostStatus(next)}
                  disabled={statusSaving}
                  label="Post"
                />
              </div>
            )}
          </div>
        </header>

        <section className="post-cats">
          {catsLoading && (
            <span className="post-cat post-cat--loading">Loading…</span>
          )}
          {!catsLoading &&
            cats?.map((c) => (
              <span key={c.id} className="post-cat">
                #{c.title}
              </span>
            ))}
        </section>

        <section className="post-body">{content}</section>

        {/* Дії (пост) */}
        <section className="post-actions">
          <div className="post-actions__left">
            <button
              type="button"
              className={`pa-btn pa-btn--rxn ${
                myReaction === "like" ? "is-active" : ""
              }`}
              title="Like"
              onClick={() => onTogglePostReaction("like")}
              disabled={reactionLoading || !isPostActive}
            >
              👍 {likes}
            </button>
            <button
              type="button"
              className={`pa-btn pa-btn--rxn ${
                myReaction === "dislike" ? "is-active" : ""
              }`}
              title="Dislike"
              onClick={() => onTogglePostReaction("dislike")}
              disabled={reactionLoading || !isPostActive}
            >
              👎 {dislikes}
            </button>
            <button
              type="button"
              className={`pa-btn ${isFav ? "is-fav" : ""}`}
              title={isPostActive ? "Add/Remove Favorite" : "Post is inactive"}
              onClick={onToggleFavorite}
              disabled={favLoading || !isPostActive}
            >
              {isFav ? "⭐ In favorites" : "☆ Add to favorites"}
            </button>
          </div>
        </section>
      </article>

      {/* Коментарі */}
      <section className="comments">
        <h2 className="comments__title">Comments</h2>

        {/* Форма нового коментаря або відповіді */}
        <form className="comment-form" onSubmit={onSubmitComment}>
          {replyTo && (
            <div className="reply-banner">
              Replying to <strong>#{replyTo.id}</strong>{" "}
              <button
                type="button"
                className="reply-cancel"
                onClick={() => setReplyTo(null)}
                disabled={!isPostActive}
              >
                Cancel
              </button>
            </div>
          )}
          <textarea
            ref={taRef}
            className="comment-input"
            placeholder={
              !isPostActive
                ? "Post is inactive"
                : token
                ? replyTo
                  ? `Reply to #${replyTo.id}… (Ctrl/⌘+Enter)`
                  : "Write a comment… (Ctrl/⌘+Enter)"
                : "Please login to comment"
            }
            rows={1}
            onInput={onTAInput}
            onKeyDown={onCommentKeyDown}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!token || commentSending || !isPostActive}
          />
          <div
            className="comment-actions"
            style={{ gap: 8, alignItems: "center" }}
          >
            {commentError && (
              <span style={{ color: "#ef4444", fontSize: 12 }}>
                {String(commentError)}
              </span>
            )}
            <button
              type="submit"
              className="comment-submit"
              disabled={
                !token || !newComment.trim() || commentSending || !isPostActive
              }
              title={
                !isPostActive
                  ? "Post is inactive"
                  : token
                  ? "Post comment"
                  : "Login required"
              }
            >
              {commentSending ? "Posting…" : replyTo ? "Reply" : "Post"}
            </button>
          </div>
        </form>

        {/* Список: 1-й рівень + згортані відповіді */}
        <div className="comments__list">
          {commentsLoading && <div className="comment-empty">Loading…</div>}
          {!commentsLoading && commentTree.length === 0 && (
            <div className="comment-empty">No comments yet.</div>
          )}
          {!commentsLoading &&
            commentTree.length > 0 &&
            commentTree.map(({ node, replies }) => {
              const isActive = (node.status ?? "active") === "active";
              const isInactive = !isActive;

              const canDeleteRoot =
                (me?.id && node.authorId === me.id) || me?.role === "admin";
              const cell = cRx[node.id] || {
                likes: node.likesCount ?? 0,
                dislikes: node.dislikesCount ?? 0,
                myReaction: null,
                loading: false,
              };
              const isCollapsed = !!collapsed[node.id];

              const isAuthor = !!(me?.id && node.authorId === me.id);
              const showToggle = isAdmin || isAuthor;

              const toggleDisabled = isAdmin ? false : isInactive;

              return (
                <div
                  key={node.id}
                  className={`comment-item ${isInactive ? "is-inactive" : ""}`}
                >
                  <div className="comment-meta">
                    <span className="comment-author">
                      {displayAuthor(node)}
                    </span>
                    <span className="comment-dot">•</span>
                    <time className="comment-date">
                      {new Date(node.createdAt).toLocaleString()}
                    </time>

                    {/* Лічильники реакцій — БЛОКУЄМО, якщо коментар неактивний */}
                    <span className="comment-dot">•</span>
                    <button
                      type="button"
                      className={`c-rxn ${
                        cell.myReaction === "like" ? "is-active" : ""
                      }`}
                      onClick={() => onToggleCommentReaction(node.id, "like")}
                      disabled={cell.loading || !isPostActive || isInactive}
                      title="Like"
                    >
                      👍 {cell.likes}
                    </button>
                    <button
                      type="button"
                      className={`c-rxn ${
                        cell.myReaction === "dislike" ? "is-active" : ""
                      }`}
                      onClick={() =>
                        onToggleCommentReaction(node.id, "dislike")
                      }
                      disabled={cell.loading || !isPostActive || isInactive}
                      title="Dislike"
                    >
                      👎 {cell.dislikes}
                    </button>

                    {/* Бейдж статусу + тумблер:
            - Адмін: завжди може
            - Автор: лише вимкнути (коли активний). Якщо вже неактивний — тумблер disabled */}
                    {showToggle && (
                      <>
                        <span className="comment-dot">•</span>
                        <span
                          className={`pc-status ${
                            isActive ? "is-ok" : "is-off"
                          }`}
                        >
                          {isActive ? "active" : "inactive"}
                        </span>
                        <span className="comment-dot">•</span>
                        <ToggleSwitch
                          checked={isActive}
                          onChange={(next) =>
                            onToggleCommentStatus(node.id, next)
                          }
                          label={isAdmin ? "Comment" : "Visible"}
                          title={
                            isAdmin
                              ? "Admin can set status"
                              : isInactive
                              ? "Cannot enable your inactive comment"
                              : "Turn your comment inactive"
                          }
                          disabled={toggleDisabled}
                        />
                      </>
                    )}

                    {/* Reply/Delete — БЛОКУЄМО, якщо коментар неактивний */}
                    <span className="comment-dot">•</span>
                    <button
                      type="button"
                      className="comment-action"
                      onClick={() => !isInactive && setReplyTo(node)}
                      title={isInactive ? "Comment is inactive" : "Reply"}
                      disabled={isInactive || !isPostActive}
                    >
                      Reply
                    </button>

                    {canDeleteRoot && (
                      <>
                        <span className="comment-dot">•</span>
                        <button
                          type="button"
                          className="comment-delete"
                          onClick={() => onDeleteComment(node)}
                          title={
                            isInactive
                              ? "Comment is inactive"
                              : "Delete comment"
                          }
                          disabled={isInactive}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  <div className="comment-content">
                    {node.pureContent ?? node.content}
                  </div>

                  {/* Replies (2-й рівень): collapsible */}
                  {!!replies.length && (
                    <div className="replies">
                      <button
                        type="button"
                        className="replies-toggle"
                        onClick={() => toggleCollapsed(node.id)}
                      >
                        {isCollapsed
                          ? `Show ${replies.length} repl${
                              replies.length === 1 ? "y" : "ies"
                            }`
                          : "Hide replies"}
                      </button>

                      {!isCollapsed && (
                        <div className="replies-list">
                          {replies.map((r) => {
                            const rActive = (r.status ?? "active") === "active";
                            const rInactive = !rActive;

                            const canDelete =
                              (me?.id && r.authorId === me.id) ||
                              me?.role === "admin";
                            const rCell = cRx[r.id] || {
                              likes: r.likesCount ?? 0,
                              dislikes: r.dislikesCount ?? 0,
                              myReaction: null,
                              loading: false,
                            };

                            const rIsAuthor = !!(
                              me?.id && r.authorId === me.id
                            );
                            const rShowToggle = isAdmin || rIsAuthor;
                            const rToggleDisabled = isAdmin ? false : rInactive;

                            return (
                              <div
                                key={r.id}
                                className={`reply-item ${
                                  rInactive ? "is-inactive" : ""
                                }`}
                              >
                                <div className="comment-meta">
                                  <span className="comment-author">
                                    {displayAuthor(r)}
                                  </span>
                                  <span className="comment-dot">•</span>
                                  <time className="comment-date">
                                    {new Date(r.createdAt).toLocaleString()}
                                  </time>

                                  <span className="comment-dot">•</span>
                                  <button
                                    type="button"
                                    className={`c-rxn ${
                                      rCell.myReaction === "like"
                                        ? "is-active"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      onToggleCommentReaction(r.id, "like")
                                    }
                                    disabled={
                                      rCell.loading ||
                                      !isPostActive ||
                                      rInactive
                                    }
                                    title="Like"
                                  >
                                    👍 {rCell.likes}
                                  </button>
                                  <button
                                    type="button"
                                    className={`c-rxn ${
                                      rCell.myReaction === "dislike"
                                        ? "is-active"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      onToggleCommentReaction(r.id, "dislike")
                                    }
                                    disabled={
                                      rCell.loading ||
                                      !isPostActive ||
                                      rInactive
                                    }
                                    title="Dislike"
                                  >
                                    👎 {rCell.dislikes}
                                  </button>

                                  {rShowToggle && (
                                    <>
                                      <span className="comment-dot">•</span>
                                      <span
                                        className={`pc-status ${
                                          rActive ? "is-ok" : "is-off"
                                        }`}
                                      >
                                        {rActive ? "active" : "inactive"}
                                      </span>
                                      <span className="comment-dot">•</span>
                                      <ToggleSwitch
                                        checked={rActive}
                                        onChange={(next) =>
                                          onToggleCommentStatus(r.id, next)
                                        }
                                        label={isAdmin ? "Comment" : "Visible"}
                                        title={
                                          isAdmin
                                            ? "Admin can set status"
                                            : rInactive
                                            ? "Cannot enable your inactive comment"
                                            : "Turn your comment inactive"
                                        }
                                        disabled={rToggleDisabled}
                                      />
                                    </>
                                  )}

                                  {canDelete && (
                                    <>
                                      <span className="comment-dot">•</span>
                                      <button
                                        type="button"
                                        className="comment-delete"
                                        onClick={() => onDeleteComment(r)}
                                        title={
                                          rInactive
                                            ? "Comment is inactive"
                                            : "Delete comment"
                                        }
                                        disabled={rInactive}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="comment-content">
                                  {r.pureContent ?? r.content}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
