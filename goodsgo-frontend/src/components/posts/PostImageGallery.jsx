import { useState } from 'react';
import PropTypes from 'prop-types';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';

export default function PostImageGallery({ images = [] }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center text-text-muted">
        <span className="text-sm">No images uploaded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-gray-100">
        <img
          src={cloudinaryUrl(images[active], { width: 1000 })}
          alt={`Post image ${active + 1} of ${images.length}`}
          decoding="async"
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              aria-label="Previous image"
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg transition-colors"
            >
              ‹
            </button>
            <button
              aria-label="Next image"
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg transition-colors"
            >
              ›
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {active + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button
              key={idx}
              aria-label={`View image ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={[
                'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                idx === active ? 'border-primary' : 'border-transparent hover:border-gray-300',
              ].join(' ')}
            >
              <img src={cloudinaryUrl(src, { width: 128 })} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

PostImageGallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
};
