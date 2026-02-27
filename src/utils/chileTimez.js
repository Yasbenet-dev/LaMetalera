// src/utils/chileTime.js
const CHILE_TIMEZONE = "America/Santiago";

// === Fechas/Horas actuales (zona Chile) ===
export const getCurrentChileDate = () => new Date();

export const getCurrentChileDateString = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
};

// === Timestamps desde hora local de Chile ===
// 1) Devuelve un ISO con offset fijo -04:00 (simple)
export const createChileTimestamp = (date) => {
  const targetDate = date || new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(targetDate).map((p) => [p.type, p.value])
  );
  const ms = String(targetDate.getMilliseconds()).padStart(3, "0");
  const offsetStr = "-04:00"; // simplificado
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${ms}${offsetStr}`;
};

// 2) Devuelve un ISO UTC que “representa” la hora local de Chile
export const createChileTimestampAsUTC = (date) => {
  const targetDate = date || new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(targetDate).map((p) => [p.type, p.value])
  );
  const chileAsUTC = new Date(
    Date.UTC(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      parseInt(parts.hour, 10),
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10),
      targetDate.getMilliseconds()
    )
  );
  return chileAsUTC.toISOString();
};

// === Parsing/format ===
export const parseToChileDate = (timestamp) => {
  const date = new Date(timestamp);
  // Devuelve un Date “construido” a partir de la vista en zona Chile
  return new Date(date.toLocaleString("en-US", { timeZone: CHILE_TIMEZONE }));
};

export const formatChileDateTime = (
  timestamp,
  {
    includeDate = false,
    includeTime = true,
    includeSeconds = false,
    format12Hour = false,
  } = {}
) => {
  const date = new Date(timestamp);
  const opts = { timeZone: CHILE_TIMEZONE };
  if (includeDate)
    Object.assign(opts, { year: "numeric", month: "2-digit", day: "2-digit" });
  if (includeTime) {
    Object.assign(opts, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: format12Hour,
    });
    if (includeSeconds) opts.second = "2-digit";
  }
  return date.toLocaleString("es-CL", opts);
};

export const formatChileTime = (timestamp, includeSeconds = false) =>
  formatChileDateTime(timestamp, {
    includeTime: true,
    includeSeconds,
    format12Hour: false,
  });

export const formatChileDate = (timestamp) => {
  const date = new Date(timestamp);
  return {
    fecha: date.toLocaleDateString("es-CL", {
      timeZone: CHILE_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    nombreDia: date.toLocaleDateString("es-CL", {
      timeZone: CHILE_TIMEZONE,
      weekday: "long",
    }),
  };
};

export const formatChileTimeFromUTC = (timestamp, includeSeconds = false) => {
  const date = new Date(timestamp);
  const opts = {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (includeSeconds) opts.second = "2-digit";
  return date.toLocaleString("es-CL", opts);
};

export const formatChileDateFromUTC = (timestamp) => {
  const date = new Date(timestamp);
  return {
    fecha: date.toLocaleDateString("es-CL", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    nombreDia: date.toLocaleDateString("es-CL", {
      timeZone: "UTC",
      weekday: "long",
    }),
  };
};

// === Lógica de negocio asistencia ===
export const calculateWorkedHours = (entrada, salida) => {
  if (!entrada || !salida) return "Incompleto";
  const a = new Date(entrada);
  const b = new Date(salida);
  const diff = b - a;
  if (Number.isNaN(diff) || diff < 0) return "Error";
  const hours = Math.floor(diff / 36e5);
  const minutes = Math.floor((diff % 36e5) / 60000);
  return `${hours}h ${minutes}m`;
};

export const isLateArrival = (entradaTimestamp) => {
  const entradaChile = parseToChileDate(entradaTimestamp);
  const limit = new Date(entradaChile);
  limit.setHours(9, 0, 0, 0); // 09:00 Chile
  // comparar en “mismo eje” UTC
  const limitUTC = new Date(limit.toLocaleString("en-US", { timeZone: "UTC" }));
  const entradaUTC = new Date(
    entradaChile.toLocaleString("en-US", { timeZone: "UTC" })
  );
  return entradaUTC > limitUTC;
};

export const getAttendanceStatus = (entrada, salida) => {
  if (!entrada) return "absent";
  if (!salida) return "incomplete";
  return isLateArrival(entrada) ? "late" : "complete";
};

// === Rangos de día Chile para filtros Supabase (timestamptz) ===
// Si filtras por una columna timestamp (ej: hora_entrada), usa estos límites:
export const chileDayRangeUTC = (ymd /* 'YYYY-MM-DD' */) => {
  // construye inicio/fin del día Chile y los expresa en UTC (ISO)
  const [y, m, d] = ymd.split("-").map(Number);
  // eslint-disable-next-line no-unused-vars
  const startChile = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  // eslint-disable-next-line no-unused-vars
  const endChile = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));

  // OJO: estos Date están “construidos” en UTC, pero representan 00:00 y 24:00 Chile solo si no hay DST.
  // Para ser estrictos a Chile (incluye DST correctamente), usamos Intl:
  const toChileMidnightISO = (y, m, d) =>
    new Date(
      new Date(
        `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
          2,
          "0"
        )}T00:00:00`
      ).toLocaleString("en-US", { timeZone: CHILE_TIMEZONE })
    ).toISOString();

  const startISO = toChileMidnightISO(y, m, d);
  const endISO = toChileMidnightISO(y, m, d + 1);

  return { startISO, endISO };
};

// Combina fecha (YYYY-MM-DD) + time (HH:MM) -> ISO timestamp simple (como en la app móvil)
export const combineDateAndTimeToISO = (fecha, time) => {
  if (!fecha || !time) return null;

  try {
    // Construir ISO timestamp simple: fecha + "T" + hora + ":00.000Z"
    // Esto es exactamente igual que la app móvil
    const isoString = `${fecha}T${time}:00.000Z`;

    // Validar que la fecha sea válida
    const testDate = new Date(isoString);
    if (isNaN(testDate.getTime())) {
      return null;
    }

    return isoString;
  } catch (error) {
    console.error("Error en combineDateAndTimeToISO:", error);
    return null;
  }
};

