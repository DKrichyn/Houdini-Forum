import React from "react";
import "./ToggleSwitch.css";

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label = "",
  title = "",
}) {
  const stop = (e) => {
    e.stopPropagation();
  };

  return (
    <label
      className={`tg ${disabled ? "is-dis" : ""}`}
      title={title}
      onClick={stop}
      onMouseDown={stop}
      onKeyDown={stop}
    >
      <input
        className="tg__inp"
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={stop}
      />
      <span className="tg__knob" aria-hidden />
    </label>
  );
}
