export function normalizeRole(input) {
  const raw = (input ?? "").toString().trim().toLowerCase();
  if (!raw) return "";

  // Alias comunes en español/variantes
  if (raw === "administrador" || raw === "admin") return "admin";
  if (raw === "trabajador" || raw === "worker" || raw === "empleado") return "worker";

  return raw;
}

export function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

export function isWorkerRole(role) {
  return normalizeRole(role) === "worker";
}

