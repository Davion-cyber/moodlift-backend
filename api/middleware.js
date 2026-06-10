// Rate limiter: tracks requests per IP using in-memory store
// Allows 20 requests per minute per IP per endpoint

const rateLimitStore = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;      // per window per IP

/**
 * Validate and rate-limit an incoming request.
 * Returns true if request is allowed, false if rejected (also sends the error response).
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean}
 */
export function validateRequest(req, res) {
  // --- Body size check ---
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10000) {
    res.status(413).json({ error: 'Request too large' });
    return false;
  }

  // --- Rate limiting ---
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const key = `${ip}:${req.url}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.windowStart + WINDOW_MS) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    if (entry.count > MAX_REQUESTS) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
        retryAfter: Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000),
      });
      return false;
    }
  }

  return true;
}

/**
 * Sanitize a string input — strip HTML tags, trim, limit length.
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeInput(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/[^\w\s.,!?'"()\-:;@#]/g, '') // strip unusual chars
    .trim()
    .slice(0, maxLength);
}
