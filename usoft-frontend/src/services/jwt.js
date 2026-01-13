export function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(
      atob(
        String(payload || "")
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );
  } catch {
    return null;
  }
}

export function getUserIdFromToken(token) {
  const p = parseJwt(token);
  return p?.id || p?.userId || p?.uid || p?.sub || null;
}

export function getRoleFromToken(token) {
  const p = parseJwt(token);

  return p?.role || p?.roles?.[0] || p?.scope || null;
}
