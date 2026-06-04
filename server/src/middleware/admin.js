const ADMIN_KEY = "topr-admin-2024";

export function requireAdmin(req, res, next) {
  if (req.get("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}
