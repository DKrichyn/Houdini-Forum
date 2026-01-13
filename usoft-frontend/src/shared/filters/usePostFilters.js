import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const parseArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Number.isFinite);
  }
  return [];
};

export default function usePostFilters(options = {}) {
  const {
    defaults = {
      sort: "likes",
      order: "desc",
      status: "active",
      page: 1,
      limit: 12,
      categories: [],
      q: "",
      from: "",
      to: "",
    },
    urlSync = true,
    replace = false,
  } = options;

  const [sp, setSp] = useSearchParams();

  const spKey = useMemo(() => sp.toString(), [sp]);

  const readFromUrl = useMemo(() => {
    if (!urlSync) return defaults;
    return {
      sort: sp.get("sort") || defaults.sort,
      order: sp.get("order") || defaults.order,
      status: sp.get("status") || defaults.status,
      page: Number(sp.get("page") || defaults.page) || 1,
      limit: Number(sp.get("limit") || defaults.limit) || defaults.limit,
      categories: parseArray(sp.get("categories")),
      q: sp.get("q") || defaults.q,
      from: sp.get("from") || defaults.from,
      to: sp.get("to") || defaults.to,
    };
  }, [spKey, urlSync, defaults]);

  const [filters, setFilters] = useState(readFromUrl);

  useEffect(() => {
    if (!urlSync) return;
    setFilters((prev) => {
      const next = readFromUrl;
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [readFromUrl, urlSync]);

  const apiParams = useMemo(() => {
    const f = filters;
    const p = { page: f.page, limit: f.limit, sort: f.sort, order: f.order };
    if (f.status) p.status = f.status;
    if (f.categories?.length === 1) p.categoryId = f.categories[0];
    else if (f.categories?.length > 1) p.categories = f.categories.join(",");
    if (f.q) p.q = f.q;
    if (f.from) p.from = f.from;
    if (f.to) p.to = f.to;
    return p;
  }, [filters]);

  const setField = useCallback((key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }, []);

  const patch = useCallback((patchObj) => {
    setFilters((f) => ({ ...f, ...patchObj, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setFilters({ ...defaults });
  }, [defaults]);

  const apply = useCallback(() => {
    if (!urlSync) return;
    const f = filters;
    const next = new URLSearchParams();
    next.set("page", String(f.page || 1));
    next.set("limit", String(f.limit || defaults.limit));
    if (f.sort) next.set("sort", f.sort);
    if (f.order) next.set("order", f.order);
    if (f.status) next.set("status", f.status);
    if (f.categories?.length) next.set("categories", f.categories.join(","));
    if (f.q) next.set("q", f.q);
    if (f.from) next.set("from", f.from);
    if (f.to) next.set("to", f.to);
    setSp(next, { replace });
  }, [filters, defaults.limit, setSp, replace, urlSync]);

  return { filters, setFilters, setField, patch, reset, apply, apiParams };
}
