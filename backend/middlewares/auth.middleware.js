import jwt from "jsonwebtoken";

const extractToken = (req) => {
  const token = req.cookies?.accessToken || req.cookies?.token;
  if (token) return token;

  const bearer = req.headers?.authorization;
  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.split(" ")[1];
  }

  return req.headers?.token || req.headers?.atoken || req.headers?.dtoken || null;
};

export const verifyToken = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ success: false, message: "Unauthorized: invalid token payload" });
    }

    req.user = { id: decoded.id, role: decoded.role };

    // Backward-compatible aliases to avoid breaking existing controller signatures during migration.
    req.userId = decoded.id;
    req.body = req.body || {};
    if (decoded.role === "doctor") req.body.docId = decoded.id;
    if (decoded.role === "patient") req.body.userId = decoded.id;

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: invalid or expired token" });
  }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  try {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ success: false, message: "Unauthorized: token not verified" });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
    }

    return next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
};
