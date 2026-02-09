import React from "react";

export const CheeseTickIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect
      x="4"
      y="4"
      width="88"
      height="88"
      rx="18"
      className="fill-green-900/20 dark:fill-green-900/40"
    />
    <path
      d="M28 50 L42 64 L68 32"
      className="stroke-green-600 dark:stroke-green-400"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheeseCrossIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect
      x="4"
      y="4"
      width="88"
      height="88"
      rx="18"
      className="fill-red-900/20 dark:fill-red-900/40"
    />
    <path
      d="M32 32 L64 64"
      className="stroke-red-600 dark:stroke-red-400"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <path
      d="M64 32 L32 64"
      className="stroke-red-600 dark:stroke-red-400"
      strokeWidth="10"
      strokeLinecap="round"
    />
  </svg>
);
