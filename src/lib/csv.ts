import { isValidFormat } from "./email";

/** Small RFC 4180 style parser. Handles quotes, escaped quotes, CRLF and a BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(text: string) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/) + 1 || 2000);
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 1 ? counts[0][0] : ",";
}

export type CsvTable = {
  header: string[];
  rows: string[][];
  hasHeader: boolean;
};

export function toTable(raw: string[][]): CsvTable {
  if (!raw.length) return { header: [], rows: [], hasHeader: false };
  const width = Math.max(...raw.map((r) => r.length));
  const pad = (r: string[]) => (r.length < width ? [...r, ...Array(width - r.length).fill("")] : r);
  const first = pad(raw[0]);
  // A first row with no email-like cells is treated as a header.
  const hasHeader = !first.some((c) => isValidFormat(c));
  const header = hasHeader
    ? first.map((h, i) => h.trim() || `Column ${i + 1}`)
    : first.map((_, i) => `Column ${i + 1}`);
  const rows = (hasHeader ? raw.slice(1) : raw).map(pad);
  return { header, rows, hasHeader };
}

/** Picks the column that most likely holds email addresses. Returns -1 when none fits. */
export function detectEmailColumn(table: CsvTable): number {
  const sample = table.rows.slice(0, 200);
  let best = -1;
  let bestScore = 0;
  table.header.forEach((name, i) => {
    const valid = sample.filter((r) => isValidFormat(r[i] || "")).length;
    let score = sample.length ? valid / sample.length : 0;
    if (/e-?mail/i.test(name)) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return bestScore >= 0.3 ? best : -1;
}

function escapeCell(value: string) {
  // Stop spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: string[][]) {
  return [header, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}
