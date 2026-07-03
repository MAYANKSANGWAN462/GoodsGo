/**
 * Rewrites a Cloudinary delivery URL to include on-the-fly transformation
 * parameters — modern format (`f_auto`), automatic quality (`q_auto`), and
 * an optional width cap — so the browser downloads an appropriately sized
 * WebP/AVIF instead of the full-resolution original upload.
 *
 * Non-Cloudinary URLs (e.g. local preview blob: URLs) are returned unchanged,
 * as are URLs that already contain a transformation segment.
 *
 * @param {string} url            - Original Cloudinary secure_url stored by the backend
 * @param {object} [options]
 * @param {number} [options.width] - Maximum delivery width in CSS pixels (Cloudinary `w_`, with `c_limit` so smaller originals are never upscaled)
 * @returns {string} Transformed URL, or the input unchanged if not transformable
 */
export function cloudinaryUrl(url, { width } = {}) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const afterUpload = url.slice(idx + marker.length);
  // Already transformed (segment right after /upload/ contains a param like w_, f_, q_)
  if (/^[a-z]+_[^/]*\//.test(afterUpload)) return url;

  const params = ['f_auto', 'q_auto'];
  if (width) params.push(`w_${Math.round(width)}`, 'c_limit');

  return `${url.slice(0, idx + marker.length)}${params.join(',')}/${afterUpload}`;
}
