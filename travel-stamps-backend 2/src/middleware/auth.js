const jwt = require("jsonwebtoken");

const COOKIE_NAME = "ts_session";

function signToken(user) {
  return jwt.sign({ sub: user.id, handle: user.handle }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

function setSessionCookie(res, user) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // never readable from client-side JS — mitigates XSS token theft
    secure: process.env.COOKIE_SECURE === "true", // must be true in production (HTTPS only)
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
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
