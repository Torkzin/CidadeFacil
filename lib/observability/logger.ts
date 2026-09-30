type LogContext = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", message: string, context: LogContext = {}) {
  const safe = Object.fromEntries(Object.entries(context).filter(([key, value]) => value !== undefined && !/password|token|secret|cookie|authorization/i.test(key)));
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...safe });
  if (level === "error") console.error(line); else if (level === "warn") console.warn(line); else console.info(line);
}

export const logger = { info: (message: string, context?: LogContext) => write("info", message, context), warn: (message: string, context?: LogContext) => write("warn", message, context), error: (message: string, context?: LogContext) => write("error", message, context) };

