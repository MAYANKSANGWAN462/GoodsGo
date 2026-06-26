import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import Button from '../common/Button';
import { getConfigOptions } from '../../services/config.service';
import { POST_TYPE_OPTIONS } from '../../constants/postTypes';

export default function PostFilters({ filters, onChange, isOpen, onClose }) {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: getConfigOptions,
    staleTime: Infinity,
  });

  const vehicleOptions = config?.vehicleTypes ?? [];
  const categoryOptions = config?.goodsCategories ?? [];

  function set(field, value) {
    onChange({ ...filters, [field]: value, page: 1 });
  }

  function handleClear() {
    onChange({ page: 1 });
  }

  const hasActiveFilters = Boolean(
    filters.post_type || filters.vehicle_type || filters.goods_category ||
    filters.origin_city || filters.destination_city || filters.date_from ||
    filters.date_to || filters.min_price || filters.max_price || filters.q
  );

  const inputClass =
    'w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

  const content = (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-xs text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Keyword search */}
      <div>
        <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-q">
          Search
        </label>
        <input
          id="filter-q"
          type="text"
          value={filters.q ?? ''}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Keywords..."
          className={inputClass}
        />
      </div>

      {/* Post type */}
      <div>
        <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-post-type">
          Post Type
        </label>
        <select
          id="filter-post-type"
          value={filters.post_type ?? ''}
          onChange={(e) => set('post_type', e.target.value)}
          className={inputClass}
        >
          {POST_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Origin city */}
      <div>
        <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-origin">
          Origin City
        </label>
        <input
          id="filter-origin"
          type="text"
          value={filters.origin_city ?? ''}
          onChange={(e) => set('origin_city', e.target.value)}
          placeholder="e.g. Mumbai"
          className={inputClass}
        />
      </div>

      {/* Destination city */}
      <div>
        <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-dest">
          Destination City
        </label>
        <input
          id="filter-dest"
          type="text"
          value={filters.destination_city ?? ''}
          onChange={(e) => set('destination_city', e.target.value)}
          placeholder="e.g. Delhi"
          className={inputClass}
        />
      </div>

      {/* Vehicle type */}
      {vehicleOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-vehicle">
            Vehicle Type
          </label>
          <select
            id="filter-vehicle"
            value={filters.vehicle_type ?? ''}
            onChange={(e) => set('vehicle_type', e.target.value)}
            className={inputClass}
          >
            <option value="">All Vehicles</option>
            {vehicleOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Goods category */}
      {categoryOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-category">
            Goods Category
          </label>
          <select
            id="filter-category"
            value={filters.goods_category ?? ''}
            onChange={(e) => set('goods_category', e.target.value)}
            className={inputClass}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Date range */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-date-from">
            Date From
          </label>
          <input
            id="filter-date-from"
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) => set('date_from', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-date-to">
            Date To
          </label>
          <input
            id="filter-date-to"
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) => set('date_to', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Price range */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-min-price">
            Min ₹
          </label>
          <input
            id="filter-min-price"
            type="number"
            min="0"
            value={filters.min_price ?? ''}
            onChange={(e) => set('min_price', e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-text mb-1" htmlFor="filter-max-price">
            Max ₹
          </label>
          <input
            id="filter-max-price"
            type="number"
            min="0"
            value={filters.max_price ?? ''}
            onChange={(e) => set('max_price', e.target.value)}
            placeholder="Any"
            className={inputClass}
          />
        </div>
      </div>

      {/* Apply button — mobile only */}
      <div className="md:hidden">
        <Button fullWidth onClick={onClose}>
          Apply Filters
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[90vw] bg-surface h-full overflow-y-auto p-5 z-50 shadow-xl">
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <div className="bg-surface rounded-xl border border-border p-5 sticky top-6">
          {content}
        </div>
      </aside>
    </>
  );
}

PostFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
};
