import rateLimit from "express-rate-limit";

// Brute-force protection on /api/auth/login.
// 5 failed attempts per 15 min per IP; successful logins don't count.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message:
      "Too many failed login attempts. Please try again in 15 minutes.",
  },
});

// Coarse DoS-style guard across all /api/* endpoints.
// 200 req/min per IP; tune up if a legitimate burst (e.g. bulk import) trips it.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
