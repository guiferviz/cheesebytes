import type {
  ButtonHTMLAttributes,
  CSSProperties,
  PropsWithChildren,
} from "react";

import "./theme.css";

export const HEATMAP_HUD: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
};

export function HeatmapVisualCard({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        border: "1px solid var(--heatmapviz-panel-edge)",
        background: "var(--heatmapviz-panel-bg)",
        color: "var(--heatmapviz-ink)",
        boxShadow: "var(--heatmapviz-panel-shadow)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(circle at top left, rgba(255,255,255,0.32), transparent 34%)",
            "radial-gradient(circle at bottom right, var(--heatmapviz-accent-soft), transparent 28%)",
            "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 42%)",
          ].join(", "),
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "grid",
          gap: 14,
          padding: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HeatmapHudBar({
  children,
  justifyContent = "space-between",
}: PropsWithChildren<{ justifyContent?: CSSProperties["justifyContent"] }>) {
  return (
    <div
      style={{
        ...HEATMAP_HUD,
        justifyContent,
      }}
    >
      {children}
    </div>
  );
}

export function HeatmapHudButton({
  active = false,
  style,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "0.45rem 0.8rem",
        background: active
          ? "var(--heatmapviz-button-bg-active)"
          : "var(--heatmapviz-button-bg)",
        color: "var(--heatmapviz-ink)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        font: "inherit",
        fontSize: "0.92rem",
        fontWeight: 700,
        transition:
          "background 120ms ease, transform 120ms ease, opacity 120ms ease",
        opacity: props.disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (props.disabled || active) return;
        event.currentTarget.style.background =
          "var(--heatmapviz-button-bg-hover)";
      }}
      onMouseLeave={(event) => {
        if (props.disabled) return;
        event.currentTarget.style.background = active
          ? "var(--heatmapviz-button-bg-active)"
          : "var(--heatmapviz-button-bg)";
      }}
    >
      {children}
    </button>
  );
}

export function HeatmapPanelLabel({ children }: PropsWithChildren<object>) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "0.28rem 0.68rem",
        background: "var(--heatmapviz-accent-soft)",
        color: "var(--heatmapviz-accent)",
        fontSize: "0.76rem",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function HeatmapShortcutLabel({ children }: PropsWithChildren<object>) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "1.7rem",
        padding: "0.16rem 0.42rem",
        borderRadius: 9,
        border: "1px solid var(--heatmapviz-panel-edge)",
        background: "rgba(255,255,255,0.36)",
        color: "var(--heatmapviz-ink)",
        fontSize: "0.75rem",
        fontWeight: 800,
      }}
    >
      {children}
    </kbd>
  );
}

export function HeatmapMetaText({ children }: PropsWithChildren<object>) {
  return (
    <span
      style={{
        color: "var(--heatmapviz-muted)",
        fontSize: "0.9rem",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
