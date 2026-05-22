const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_PAYLOAD_SIZE = 1000;

const rateLimitStore = new Map();

export function rateLimit(ip) {
  const now = Date.now();
  const key = `${ip}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return null;
  if (input.length > MAX_PAYLOAD_SIZE) return null;
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"]/g, '')
    .trim();
}

export function validateRequest(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const limit = rateLimit(ip);

  res.setHeader('X-RateLimit-Remaining', limit.remaining);

  if (!limit.allowed) {
    res.status(429).json({
      error: 'Too many requests. Please wait 15 minutes before trying again.',
      resetTime: limit.resetTime,
    });
    return false;
  }

  if (req.method === 'POST') {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 5000) {
      res.status(413).json({ error: 'Payload too large' });
      return false;
    }
  }

  return true;
}
