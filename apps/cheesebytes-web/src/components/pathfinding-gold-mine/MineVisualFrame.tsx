import React from "react";
import "./goldmine-theme.css";
import { fullscreenInnerStyle, fullscreenRootStyle } from "./useFullscreen";

export const MINE_HUD = {
  bg: "var(--goldmine-hud-bg)",
  border: "var(--goldmine-hud-border)",
  text: "var(--goldmine-hud-text)",
  muted: "var(--goldmine-hud-muted)",
  accent: "var(--goldmine-hud-accent)",
  btnBg: "var(--goldmine-hud-btn-bg)",
  activeBg: "var(--goldmine-hud-active-bg)",
  activeText: "var(--goldmine-hud-active-text)",
} as const;

export interface MineVisualFrameProps {
  children: React.ReactNode;
  rootRef?: React.Ref<HTMLDivElement>;
  innerRef?: React.Ref<HTMLDivElement>;
  isFullscreen?: boolean;
  maxWidth?: number;
  margin?: React.CSSProperties["margin"];
  focusable?: boolean;
  tabIndex?: number;
  rootStyle?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
}

export const MineVisualFrame: React.FC<MineVisualFrameProps> = ({
  children,
  rootRef,
  innerRef,
  isFullscreen = false,
  maxWidth = 900,
  margin = "2rem auto",
  focusable = false,
  tabIndex,
  rootStyle,
  innerStyle,
}) => (
  <div
    ref={rootRef}
    tabIndex={tabIndex ?? (focusable ? 0 : undefined)}
    style={{
      ...fullscreenRootStyle(isFullscreen),
      outline: focusable ? "none" : undefined,
      ...rootStyle,
    }}
  >
    <div
      ref={innerRef}
      style={{
        ...fullscreenInnerStyle(isFullscreen, maxWidth),
        margin: isFullscreen ? 0 : margin,
        ...innerStyle,
      }}
    >
      {children}
    </div>
  </div>
);

export interface MineHudBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  attachedTop?: boolean;
}

export const MineHudBar: React.FC<MineHudBarProps> = ({
  attachedTop = true,
  children,
  style,
  ...props
}) => (
  <div
    {...props}
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      background: MINE_HUD.bg,
      border: `2px solid ${MINE_HUD.border}`,
      borderTop: attachedTop ? "none" : `2px solid ${MINE_HUD.border}`,
      padding: "7px 12px",
      fontFamily: "monospace",
      fontSize: 11,
      color: MINE_HUD.text,
      userSelect: "none",
      minHeight: 34,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

export interface MineHudButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  minWidth?: number;
  preventMouseDownFocus?: boolean;
}

export const MineHudButton: React.FC<MineHudButtonProps> = ({
  active = false,
  disabled = false,
  minWidth,
  preventMouseDownFocus = true,
  children,
  style,
  onMouseDown,
  ...props
}) => (
  <button
    type="button"
    tabIndex={-1}
    disabled={disabled}
    onMouseDown={(event) => {
      if (preventMouseDownFocus) event.preventDefault();
      onMouseDown?.(event);
    }}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      padding: "3px 8px",
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "monospace",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1,
      border: `1px solid ${MINE_HUD.border}`,
      background: active ? MINE_HUD.activeBg : MINE_HUD.btnBg,
      color: active ? MINE_HUD.activeText : MINE_HUD.text,
      whiteSpace: "nowrap",
      minWidth,
      ...style,
    }}
    {...props}
  >
    {children}
  </button>
);

export interface MinePanelLabelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const MinePanelLabel: React.FC<MinePanelLabelProps> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "var(--goldmine-label-fg)",
      marginBottom: 6,
      opacity: 0.7,
      ...style,
    }}
  >
    {children}
  </div>
);

export const MineShortcutLabel: React.FC<{ hotkey: string; label: string }> = ({
  hotkey,
  label,
}) => (
  <span style={{ display: "inline-flex", alignItems: "baseline" }}>
    <span style={{ fontWeight: 800, textDecoration: "underline" }}>
      {hotkey}
    </span>
    <span style={{ marginLeft: "-0.04em" }}>{label}</span>
  </span>
);
