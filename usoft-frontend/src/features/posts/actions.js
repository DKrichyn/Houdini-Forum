import { fetchPostsApi, getCategoryPostsApi } from "./api";

export const POSTS_FETCH_START = "posts/fetchStart";
export const POSTS_FETCH_SUCCESS = "posts/fetchSuccess";
export const POSTS_FETCH_ERROR = "posts/fetchError";

export function fetchPosts(params = {}) {
  return async (dispatch) => {
    dispatch({ type: POSTS_FETCH_START });
    try {
      const {
        categories,
        match,
        page: _page,
        limit: _limit,
        sort: _sort,
        order: _order,
        status: _status,
        ...rest
      } = params || {};

      const page = Number(_page) >= 1 ? Number(_page) : 1;
      const limit = Math.max(1, Math.min(100, Number(_limit) || 10));
      const sort = _sort === "date" ? "date" : "likes";
      const order = _order === "asc" ? "asc" : "desc";
      const status =
        _status === "inactive" || _status === "all" ? _status : "active";
      const dir = order === "asc" ? 1 : -1;

      const statusPass = (p) => {
        if (status === "all") return true;
        return String(p.status || "").toLowerCase() === "active";
      };

      const sortFn = (a, b) => {
        if (sort === "date") {
          return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
        }
        const la = Number(a.likesCount || 0);
        const lb = Number(b.likesCount || 0);
        return (la - lb) * dir;
      };

      if (!Array.isArray(categories) || categories.length === 0) {
        const data = await fetchPostsApi({
          page,
          limit,
          sort,
          order,
          status,
          ...rest,
        });
        dispatch({ type: POSTS_FETCH_SUCCESS, payload: data });
        return;
      }

      if (categories.length === 1) {
        const catId = Number(categories[0]);
        const listAll = await getCategoryPostsApi(catId);
        const pool = (Array.isArray(listAll) ? listAll : []).filter(statusPass);
        pool.sort(sortFn);

        const start = (page - 1) * limit;
        const paged = pool.slice(start, start + limit);
        dispatch({
          type: POSTS_FETCH_SUCCESS,
          payload: { total: pool.length, page, limit, items: paged },
        });
        return;
      }

      const ids = categories.map(Number).filter(Number.isFinite);
      const lists = await Promise.all(
        ids.map((cid) => getCategoryPostsApi(cid))
      );

      const arrays = lists.map((arr) => (Array.isArray(arr) ? arr : []));

      let combined = [];
      if (match === "all") {
        const seenCount = new Map();
        const byId = new Map();
        arrays.forEach((arr) => {
          const once = new Set();
          arr.forEach((p) => {
            if (!p || !p.id) return;
            if (once.has(p.id)) return;
            once.add(p.id);
            seenCount.set(p.id, (seenCount.get(p.id) || 0) + 1);
            if (!byId.has(p.id)) byId.set(p.id, p);
          });
        });
        const need = arrays.length;
        combined = [];
        for (const [id2, cnt] of seenCount.entries()) {
          if (cnt === need) combined.push(byId.get(id2));
        }
      } else {
        const byId = new Map();
        arrays.forEach((arr) => {
          arr.forEach((p) => {
            if (!p || !p.id) return;
            if (!byId.has(p.id)) byId.set(p.id, p);
          });
        });
        combined = Array.from(byId.values());
      }

      const pool = combined.filter(statusPass);
      pool.sort(sortFn);

      const start = (page - 1) * limit;
      const paged = pool.slice(start, start + limit);

      dispatch({
        type: POSTS_FETCH_SUCCESS,
        payload: { total: pool.length, page, limit, items: paged },
      });
    } catch (e) {
      dispatch({
        type: POSTS_FETCH_ERROR,
        error: e?.message || "Failed to load posts",
      });
    }
  };
}
