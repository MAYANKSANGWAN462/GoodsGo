import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useFeed } from '../../hooks/usePosts';
import PostList from '../../components/posts/PostList';
import PostFilters from '../../components/posts/PostFilters';
import Button from '../../components/common/Button';
import MarketplaceBackground from '../../components/marketplace/MarketplaceBackground';

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse URL search params into a filter object with correct types. */
function parseFilters(searchParams) {
  const filters = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== '') filters[key] = value;
  }
  filters.page = filters.page ? Number(filters.page) : 1;
  return filters;
}

function countActiveFilters(filters) {
  const SKIP = new Set(['page']);
  return Object.entries(filters).filter(([k, v]) => !SKIP.has(k) && v !== '' && v != null).length;
}

// ── City search bar ───────────────────────────────────────────────────────────

function CitySearchBar({ onSearch }) {
  const fromRef = useRef(null);
  const toRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch({
      origin_city: fromRef.current?.value?.trim() || undefined,
      destination_city: toRef.current?.value?.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-4 mb-6 shadow-sm animate-fade-in-down"
    >
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
            From City
          </label>
          <input
            ref={fromRef}
            type="text"
            placeholder="e.g. Delhi"
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          />
        </div>

        {/* Route arrow */}
        <div className="hidden sm:flex items-center pb-0.5 text-text-subtle flex-shrink-0">
          <ArrowRightIcon />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
            To City
          </label>
          <input
            ref={toRef}
            type="text"
            placeholder="e.g. Mumbai"
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          />
        </div>

        <div className="flex-shrink-0">
          <Button type="submit" size="md" className="w-full sm:w-auto gap-2">
            <SearchIcon />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}

CitySearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = parseFilters(searchParams);
  const activeFilterCount = countActiveFilters(filters);

  const { data, isLoading, isError } = useFeed(filters);
  const posts = data?.data ?? [];
  const meta = data?.meta ?? null;

  const handleFilterChange = useCallback(
    (newFilters) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(newFilters)) {
        if (value !== '' && value !== null && value !== undefined) {
          params.set(key, String(value));
        }
      }
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const handlePageChange = useCallback(
    (page) => {
      handleFilterChange({ ...filters, page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters, handleFilterChange]
  );

  function handleCitySearch({ origin_city, destination_city }) {
    const next = { ...filters, page: 1 };
    if (origin_city) next.origin_city = origin_city;
    else delete next.origin_city;
    if (destination_city) next.destination_city = destination_city;
    else delete next.destination_city;
    handleFilterChange(next);
  }

  return (
    <>
      {/* Background: fixed to the full viewport below the sticky navbar (h-14 = 3.5rem).
          pointer-events-none so it never intercepts clicks. */}
      <div
        className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none"
        style={{ top: '3.5rem', zIndex: 1 }}
      >
        <MarketplaceBackground />
      </div>

      {/* Marketplace content — elevated above the fixed background */}
      <div className="relative animate-fade-in" style={{ zIndex: 2 }}>
      {/* ── Page header — frosted card so title text reads against the sky ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap bg-surface/80 backdrop-blur-sm rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <SearchIcon />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-text">Marketplace</h1>
              {/* Post count badge */}
              {meta && !isLoading && (
                <span className="inline-flex items-center text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-0.5 animate-scale-in">
                  {meta.total} {meta.total === 1 ? 'post' : 'posts'}
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm mt-0.5">
              Browse transport listings across India
            </p>
          </div>
        </div>

        {/* Mobile filter toggle with badge */}
        <div className="md:hidden relative flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5"
          >
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Desktop filter count indicator */}
        {activeFilterCount > 0 && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
            <button
              type="button"
              onClick={() => handleFilterChange({ page: 1 })}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── City search bar ───────────────────────────────────────── */}
      <CitySearchBar onSearch={handleCitySearch} />

      {/* ── Filter sidebar + post grid ────────────────────────────── */}
      <div className="flex gap-6 items-start">
        <PostFilters
          filters={filters}
          onChange={handleFilterChange}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        <div className="flex-1 min-w-0">
          <PostList
            posts={posts}
            isLoading={isLoading}
            isError={isError}
            meta={meta}
            currentPage={filters.page}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
      </div>
    </>
  );
}
