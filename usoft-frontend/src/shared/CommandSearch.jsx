import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_COMMANDS } from "../search/commands";
import "./CommandSearch.css";

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

function acronymScore(q, title) {
  const letters = String(title || "")
    .split(/\s+/)
    .map((w) => w[0]?.toLowerCase())
    .filter(Boolean)
    .join("");
  return letters.startsWith(String(q).toLowerCase()) ? 3 : 0;
}

function matchScore(cmd, q) {
  const nq = normalize(q);
  if (!nq) return 0;

  const title = normalize(cmd.title);
  const group = normalize(cmd.group || "");
  const kws = (cmd.keywords || []).map(normalize);

  let s = 0;

  if (title === nq) s += 100;
  else if (title.startsWith(nq)) s += 60;
  else if (title.includes(nq)) s += 30;

  for (const k of kws) {
    if (k === nq) s += 40;
    else if (k.startsWith(nq)) s += 20;
    else if (k.includes(nq)) s += 10;
  }

  if (group.startsWith(nq)) s += 6;
  else if (group.includes(nq)) s += 3;

  s += acronymScore(nq, cmd.title);

  return s;
}

export default function CommandSearch({
  placeholder = "Jump to… (Ctrl/⌘+K)",
  disabled = false,
}) {
  const nav = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef(null);
  const boxRef = useRef(null);

  const results = useMemo(() => {
    if (disabled) return [];
    const q = value.trim();
    if (!q) return [];
    const withScore = ALL_COMMANDS.map((c) => ({ c, s: matchScore(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return withScore.map((x) => x.c).slice(0, 8);
  }, [value, disabled]);

  useEffect(() => {
    if (disabled) return;
    function onDoc(e) {
      const t = e.target;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setActiveIdx(0);
      return;
    }
    setOpen(results.length > 0);
    setActiveIdx(0);
  }, [results.length, disabled]);

  useEffect(() => {
    function computeHasResults(q) {
      const nq = q.trim();
      if (!nq) return false;
      for (const cmd of ALL_COMMANDS) {
        if (matchScore(cmd, nq) > 0) return true;
      }
      return false;
    }
    function onKey(e) {
      if (disabled) return;
      const k = String(e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        const input = inputRef.current;
        input?.focus();
        const current = input?.value || "";
        setOpen(computeHasResults(current));
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [disabled]);

  function runAction(cmd) {
    if (disabled) return;
    try {
      cmd.action(nav);
    } finally {
      setOpen(false);
      setValue("");
      inputRef.current?.blur();
    }
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[activeIdx];
      if (chosen) runAction(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className={`cmd ${disabled ? "is-disabled" : ""}`}
      ref={boxRef}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        className="cmd__input"
        type="search"
        value={value}
        onChange={(e) => {
          if (!disabled) setValue(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Command search"
        onFocus={() => {
          if (disabled) return;
          setOpen(value.trim().length > 0 && results.length > 0);
        }}
        disabled={disabled}
      />

      {!disabled && open && (
        <div className="cmd__menu" role="listbox" aria-label="Commands">
          {results.map((r, i) => (
            <button
              key={r.id}
              className={`cmd__item ${i === activeIdx ? "is-active" : ""}`}
              role="option"
              onClick={() => runAction(r)}
            >
              <div className="cmd__title">{r.title}</div>
              <div className="cmd__group">{r.group}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
