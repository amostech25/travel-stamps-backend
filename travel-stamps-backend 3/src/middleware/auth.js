const jwt = require("jsonwebtoken");

const COOKIE_NAME = "ts_session";

function signToken(user) {
  return jwt.sign({ sub: user.id, handle: user.handle }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

function setSessionCookie(res, user) {
  const token = signToken(user);
  const secure = process.env.COOKIE_SECURE === "true";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // never readable from client-side JS — mitigates XSS token theft
    secure, // must be true in production (HTTPS only)
    // "lax" cookies are withheld by the browser on cross-site fetch/XHR requests —
    // only safe top-level navigations get them. Since the frontend (Netlify) and
    // this API (Render) are different origins, every authenticated fetch() call
    // counts as cross-site, so the cookie was silently never being sent. "none"
    // allows it, but browsers require "none" to be paired with secure:true, which
    // is only true once COOKIE_SECURE=true (i.e. real HTTPS, not local dev).
    sameSite: secure ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

function clearSessionCookie(res) {
  const secure = process.env.COOKIE_SECURE === "true";
  res.clearCookie(COOKIE_NAME, { path: "/", secure, sameSite: secure ? "none" : "lax" });
}

// Attaches req.userId / req.userHandle if a valid session cookie is present.
// Does NOT reject the request if absent — use requireAuth for that. This lets
// public routes (e.g. viewing a profile) still know "is the viewer the owner?"
function attachUser(req, _res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload.sub;
      req.userHandle = payload.handle;
    } catch (e) {
      // invalid/expired token — treat as logged out rather than erroring
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Sign in required." });
  }
  next();
}

module.exports = { COOKIE_NAME, setSessionCookie, clearSessionCookie, attachUser, requireAuth };
