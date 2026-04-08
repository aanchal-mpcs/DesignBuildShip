"use client";

import type { SortKey } from "@/lib/sort-filter";

type Status = "want_to_read" | "reading" | "finished";

interface Props {
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  filter?: Status | "all";
  onFilterChange?: (status: Status | "all") => void;
  counts?: Record<string, number>;
  showDateSort?: boolean;
}

const sortOptions: { key: SortKey; label: string; needsDate?: boolean }[] = [
  { key: "date-desc", label: "Newest first", needsDate: true },
  { key: "date-asc", label: "Oldest first", needsDate: true },
  { key: "title-asc", label: "Title A-Z" },
  { key: "title-desc", label: "Title Z-A" },
  { key: "author-asc", label: "Author A-Z" },
  { key: "author-desc", label: "Author Z-A" },
];

const filterTabs: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "want_to_read", label: "Want to Read" },
  { key: "reading", label: "Reading" },
  { key: "finished", label: "Finished" },
];

const activeTabStyle: Record<string, string> = {
  all: "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100",
  want_to_read: "border-amber-500 text-amber-700 dark:text-amber-400",
  reading: "border-blue-500 text-blue-700 dark:text-blue-400",
  finished: "border-emerald-500 text-emerald-700 dark:text-emerald-400",
};

export default function SortFilterBar({
  sortKey,
  onSortChange,
  filter,
  onFilterChange,
  counts,
  showDateSort = true,
}: Props) {
  const visibleSorts = showDateSort
    ? sortOptions
    : sortOptions.filter((o) => !o.needsDate);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      {/* Filter tabs */}
      {onFilterChange && filter !== undefined && (
        <div className="flex gap-0 overflow-x-auto border-b border-stone-200 dark:border-stone-800 sm:border-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 sm:border-b-0 sm:rounded-md transition-colors ${
                filter === tab.key
                  ? `${activeTabStyle[tab.key]} sm:bg-stone-100 sm:dark:bg-stone-800`
                  : "border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              {tab.label}
              {counts && counts[tab.key] !== undefined && (
                <span className="ml-1 text-xs text-stone-400">
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sort dropdown */}
      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="self-end sm:self-auto rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        aria-label="Sort books"
      >
        {visibleSorts.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
