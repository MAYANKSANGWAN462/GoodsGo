/**
 * Parses the standard error shape from the Axios interceptor into a display string.
 * @param {unknown} err - The error object caught in a mutation onError handler.
 * @returns {string} Human-readable error message.
 */
export function parseError(err) {
  if (!err) return 'An unexpected error occurred.';
  if (typeof err.message === 'string' && err.message) return err.message;
  return 'An unexpected error occurred.';
}

/**
 * Extracts field-level errors from the standard error shape.
 * @param {unknown} err
 * @returns {Array<{field: string, message: string}>}
 */
export function parseFieldErrors(err) {
  if (!err || !Array.isArray(err.errors)) return [];
  return err.errors;
}
