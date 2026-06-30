import PropTypes from 'prop-types';

function PageButton({ page, active, disabled, onClick }) {
  if (active) {
    return (
      <button
        type="button"
        aria-current="page"
        className="min-w-[2rem] h-8 px-3 text-sm font-semibold rounded-lg bg-primary text-white shadow-sm"
      >
        {page}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-w-[2rem] h-8 px-3 text-sm font-medium rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {page}
    </button>
  );
}

PageButton.propTypes = {
  page: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

function ChevronButton({ direction, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous page' : 'Next page'}
      className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-overlay transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        {direction === 'prev' ? (
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        )}
      </svg>
    </button>
  );
}

ChevronButton.propTypes = {
  direction: PropTypes.oneOf(['prev', 'next']).isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

/**
 * Pagination bar with prev/next buttons, page number buttons, and ellipsis.
 *
 * @param {object}   props
 * @param {number}   props.currentPage  - 1-indexed
 * @param {number}   props.totalPages
 * @param {function} props.onPageChange
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const delta = 1;
  const rangeStart = Math.max(1, currentPage - delta);
  const rangeEnd   = Math.min(totalPages, currentPage + delta);

  const pages = [];

  if (rangeStart > 2) {
    pages.push(1, '...');
  } else if (rangeStart === 2) {
    pages.push(1);
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < totalPages - 1) {
    pages.push('...', totalPages);
  } else if (rangeEnd === totalPages - 1) {
    pages.push(totalPages);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-6 flex-wrap">
      <ChevronButton
        direction="prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      />

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-text-subtle text-sm select-none">
            …
          </span>
        ) : (
          <PageButton
            key={page}
            page={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          />
        )
      )}

      <ChevronButton
        direction="next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      />
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};
