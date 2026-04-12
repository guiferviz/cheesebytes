import React, { useState } from "react";

interface NoteSummary {
  id: string;
  title: string;
  description: string;
  cheeseImage: string;
}

interface RandomBiteProps {
  notes: NoteSummary[];
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, target, alias) => alias || target,
    )
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*>]\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

const RandomBite: React.FC<RandomBiteProps> = ({ notes }) => {
  const [current, setCurrent] = useState<NoteSummary | null>(null);

  const pickRandom = () => {
    if (notes.length === 0) return;
    let next: NoteSummary;
    do {
      next = notes[Math.floor(Math.random() * notes.length)];
    } while (notes.length > 1 && next.id === current?.id);
    setCurrent(next);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={pickRandom}
        className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-gray-900 font-bold transition-colors cursor-pointer"
      >
        {current ? "Another bite" : "Take a bite"}
      </button>

      {current && (
        <a
          href={`/${current.id}`}
          className="block w-full max-w-lg no-underline group"
        >
          <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white/85 dark:bg-gray-900/60 p-5 transition-all hover:border-yellow-600/50 dark:hover:border-yellow-500/50 hover:bg-white dark:hover:bg-gray-900/80 shadow-sm hover:shadow-md dark:shadow-none">
            <div className="flex items-center gap-3 mb-3">
              <img src={current.cheeseImage} alt="" className="w-8 h-8" />
              <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-400 group-hover:text-yellow-800 dark:group-hover:text-yellow-300 m-0">
                {current.title}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed m-0 line-clamp-3">
              {stripMarkdown(current.description)}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-500 mt-3 block">
              Click to read the full note →
            </span>
          </div>
        </a>
      )}
    </div>
  );
};

export default RandomBite;
