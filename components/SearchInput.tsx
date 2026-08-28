"use client";

import qs from "query-string";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IoMdClose } from "react-icons/io";

import useDebounce from "@/hooks/useDebounce";
import useRecentSearches from "@/hooks/useRecentSearches";
import Input from "./Input";

interface SearchInputProps {
  /** The query the page was rendered with, so the field survives a reload. */
  initialValue?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ initialValue = "" }) => {
  const router = useRouter();
  const [value, setValue] = useState<string>(initialValue);
  const debouncedValue = useDebounce<string>(value, 400);
  const { searches, remember, clear } = useRecentSearches();

  // The effect below runs on mount too. Without this guard, arriving at
  // /search?title=x would immediately push the same URL again.
  const lastPushed = useRef(initialValue);

  useEffect(() => {
    if (debouncedValue === lastPushed.current) return;
    lastPushed.current = debouncedValue;

    router.push(qs.stringifyUrl({ url: "/search", query: { title: debouncedValue } }));
    remember(debouncedValue);
  }, [debouncedValue, router, remember]);

  const runSearch = (term: string) => {
    setValue(term);
  };

  return (
    <div className="flex flex-col gap-y-3">
      <label htmlFor="catalog-search" className="sr-only">
        Search songs and artists
      </label>
      <Input
        id="catalog-search"
        type="search"
        placeholder="Songs or artists"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      {searches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-content-muted">
            Recent
          </span>
          {searches.map((term) => (
            <button
              key={term}
              onClick={() => runSearch(term)}
              className="rounded-full bg-surface-hover px-3 py-1 text-sm text-content hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {term}
            </button>
          ))}
          <button
            onClick={clear}
            aria-label="Clear recent searches"
            className="rounded-full p-1 text-content-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <IoMdClose size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
