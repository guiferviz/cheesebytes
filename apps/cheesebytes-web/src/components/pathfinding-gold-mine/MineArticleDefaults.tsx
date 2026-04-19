import React, { useEffect } from "react";
import {
  configureArticleDefaults,
  DEFAULT_NEIGHBORS_PYTHON,
  resetArticleDefaults,
} from "./article-store";

export interface MineArticleDefaultsProps {
  rawMap: string[];
  markersPython: string;
  neighborsPython?: string;
}

export const MineArticleDefaults: React.FC<MineArticleDefaultsProps> = ({
  rawMap,
  markersPython,
  neighborsPython = DEFAULT_NEIGHBORS_PYTHON,
}) => {
  useEffect(() => {
    configureArticleDefaults({
      map: rawMap,
      markersPython,
      neighborsPython,
    });

    return () => {
      resetArticleDefaults();
    };
  }, [rawMap, markersPython, neighborsPython]);

  return null;
};

export default MineArticleDefaults;
