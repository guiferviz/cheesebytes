/**
 * GoldMineArticleDemo — thin wrapper around GoldMineDemo that subscribes to
 * the article-wide map store.  Whenever the map changes (code editor, visual
 * editor, …) the game automatically restarts with the new layout.
 *
 * GoldMineDemo itself stays pure (static `rawMap` prop, no store awareness).
 */
import React from "react";
import { GoldMineDemo } from "./GoldMineDemo";
import type { GoldMineDemoProps } from "./GoldMineDemo";
import { useArticleGrid } from "./gold-mine-article";

export const GoldMineArticleDemo: React.FC<
  Omit<GoldMineDemoProps, "rawMap">
> = (props) => {
  const grid = useArticleGrid();
  return <GoldMineDemo {...props} rawMap={grid} />;
};
