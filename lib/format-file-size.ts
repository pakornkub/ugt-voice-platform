// lib/format-file-size.ts — human-readable byte size ("1.4 MB"), shared by the attachment mapper
// (server) and the attachment UI (client). No central lib/format.ts exists in this project
// (docs/DESIGN.md §5), and this file must stay free of server-only / env imports.
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIdx]}`;
}
