import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFeed } from '../../hooks/usePosts';
import PostList from '../../components/posts/PostList';
import PostFilters from '../../components/posts/PostFilters';
import Button from '../../components/common/Button';

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

/** Parse URL search params into a filter object with correct types. */
function parseFilters(searchParams) {
  const filters = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== '') filters[key] = value;
  }
  filters.page = filters.page ? Number(filters.page) : 1;
  return filters;
}

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = parseFilters(searchParams);

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

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Marketplace</h1>
          {meta && !isLoading && (
            <p className="text-text-muted text-sm mt-0.5">
              {meta.total} post{meta.total !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Mobile: filter toggle */}
        <div className="md:hidden">
          <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
            <FilterIcon />
            Filters
          </Button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Filters: mobile drawer + desktop sidebar */}
        <PostFilters
          filters={filters}
          onChange={handleFilterChange}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        {/* Post grid */}
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
  );
}
