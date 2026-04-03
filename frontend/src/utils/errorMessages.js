/**
 * Maps known technical backend/HTTP error messages to user-friendly strings.
 * Use getErrorMessage(err, fallback) everywhere instead of err.response?.data?.message.
 */

// Raw backend messages (case-insensitive substring match) → friendly copy
const TECHNICAL_MESSAGE_MAP = [
  // JWT / session
  ['refresh token failed', 'Your session has expired. Please sign in again.'],
  ['jwt expired', 'Your session has expired. Please sign in again.'],
  ['jwt malformed', 'Invalid session. Please sign in again.'],
  ['token expired', 'Your session has expired. Please sign in again.'],
  ['invalid token', 'Invalid session. Please sign in again.'],
  ['invalid signature', 'Invalid session. Please sign in again.'],
  ['no token provided', 'Please sign in to continue.'],
  ['not authenticated', 'Please sign in to continue.'],
  ['unauthorized', 'Please sign in to continue.'],
  // Permissions
  ['access denied', "You don't have permission to do that."],
  ['forbidden', "You don't have permission to do that."],
  ['insufficient permissions', "You don't have permission to do that."],
  // MongoDB / DB
  ['e11000 duplicate key', 'This record already exists.'],
  ['cast to objectid', 'Invalid ID format.'],
  ['validation failed', 'Please check your input and try again.'],
  // Network
  ['network error', 'Network error. Please check your connection.'],
  ['econnrefused', 'Unable to reach the server. Please try again.'],
];

// HTTP status code → friendly fallback (used when backend message is absent or too technical)
const HTTP_STATUS_MAP = {
  400: 'Please check your input and try again.',
  401: 'Please sign in to continue.',
  403: "You don't have permission to do that.",
  404: 'The requested item was not found.',
  409: 'This record already exists.',
  422: 'Please check your input and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Service is unavailable. Please try again shortly.',
  503: 'Service is temporarily unavailable. Please try again.',
};

// Terms that indicate a message is too technical for end users
const TECHNICAL_TERMS = ['jwt', 'token', 'e11000', 'cast to', 'stack', 'traceback', 'error:', 'exception'];

function isTechnical(msg) {
  const lower = msg.toLowerCase();
  return TECHNICAL_TERMS.some((t) => lower.includes(t));
}

/**
 * @param {any} err - The caught error (axios error or plain Error)
 * @param {string} fallback - Default message if nothing better is found
 * @returns {string} A user-friendly error message
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  // No response = network / client-side error
  if (!err?.response) {
    const msg = err?.message || '';
    if (!msg || isTechnical(msg)) return fallback;
    // Check technical map
    const lower = msg.toLowerCase();
    const mapped = TECHNICAL_MESSAGE_MAP.find(([key]) => lower.includes(key));
    if (mapped) return mapped[1];
    return fallback;
  }

  const status = err.response.status;
  const backendMsg = err.response?.data?.message;

  if (backendMsg) {
    const lower = backendMsg.toLowerCase();
    // Always sanitize known technical messages
    const mapped = TECHNICAL_MESSAGE_MAP.find(([key]) => lower.includes(key));
    if (mapped) return mapped[1];
    // If it reads like a user-facing message, use it
    if (!isTechnical(backendMsg)) return backendMsg;
  }

  // Fall back to HTTP status code mapping or the provided fallback
  return HTTP_STATUS_MAP[status] || fallback;
}
