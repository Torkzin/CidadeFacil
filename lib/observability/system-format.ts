export type BackupSummary = {
  timestamp: string;
  databaseFile: string;
  uploadsFile: string;
};

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Indisponível";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}

export function findLatestCompleteBackup(
  files: string[],
): BackupSummary | null {
  const databaseFiles = new Map<string, string>();
  const uploadsFiles = new Map<string, string>();
  for (const file of files) {
    const databaseMatch = /^database-(\d{8}T\d{6}Z)\.dump$/.exec(file);
    if (databaseMatch) databaseFiles.set(databaseMatch[1], file);
    const uploadsMatch = /^uploads-(\d{8}T\d{6}Z)\.tar\.gz$/.exec(file);
    if (uploadsMatch) uploadsFiles.set(uploadsMatch[1], file);
  }
  const timestamp = [...databaseFiles.keys()]
    .filter((value) => uploadsFiles.has(value))
    .sort()
    .at(-1);
  if (!timestamp) return null;
  return {
    timestamp,
    databaseFile: databaseFiles.get(timestamp)!,
    uploadsFile: uploadsFiles.get(timestamp)!,
  };
}

export function backupTimestampToIso(timestamp: string) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
    timestamp,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const value = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
  );
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}
