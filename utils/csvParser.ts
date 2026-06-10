export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  preview: Record<string, string>[];
}

/**
 * Parses a CSV raw string into structured headers and records,
 * supporting quoted values, escaped quotes, and dynamic delimiter detection (, or ;).
 */
export function parseCSV(text: string): CSVParseResult {
  if (!text || text.trim() === '') {
    return { headers: [], rows: [], preview: [] };
  }

  // 1. Detect delimiter by counting occurrences in the first line
  const firstLine = text.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Double quote inside quotes means literal quote (escaped)
          currentField += '"';
          i++; // skip next char
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        // Skip \n if we just handled \r (Windows style)
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }
  }

  // Handle final field and row if the file didn't end with a newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [], preview: [] };
  }

  // Clean headers from leftover surrounding quotes
  const headers = lines[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  // Map remaining rows to headers
  for (let i = 1; i < lines.length; i++) {
    const rowCells = lines[i];
    const rowObj: Record<string, string> = {};

    headers.forEach((header, index) => {
      rowObj[header] = rowCells[index] !== undefined ? rowCells[index] : '';
    });

    rows.push(rowObj);
  }

  const preview = rows.slice(0, 3);

  return { headers, rows, preview };
}
