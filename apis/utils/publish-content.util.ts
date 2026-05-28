function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TEXT_STYLE = 'color:#000;';
const HEADING_STYLE = `${TEXT_STYLE}font-weight:700;`;
const PARAGRAPH_STYLE = `${TEXT_STYLE}text-indent:2em;line-height:1.8;margin:0 0 12px;`;
const LIST_STYLE = `${TEXT_STYLE}line-height:1.8;margin:0 0 12px 2em;padding:0;`;
const TABLE_STYLE = `${TEXT_STYLE}border-collapse:collapse;border:1px solid #000;margin:12px 0;width:100%;`;
const TABLE_CELL_STYLE = `${TEXT_STYLE}border:1px solid #000;padding:6px 8px;`;
const TABLE_HEADER_STYLE = `${TABLE_CELL_STYLE}font-weight:700;`;

function renderInline(markdown: string): string {
  let text = escapeHtml(markdown);
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img src="$2" alt="$1" />');
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(lines: string[]): string {
  const rows = lines.filter((line) => line.trim()).map(splitTableRow);
  if (rows.length < 2 || !isTableSeparator(lines[1])) return '';

  const headers = rows[0];
  const body = rows.slice(2);
  const thead = `<thead><tr>${headers.map((cell) => `<th style="${TABLE_HEADER_STYLE}">${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = body.length
    ? `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td style="${TABLE_CELL_STYLE}">${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<table border="1" cellspacing="0" cellpadding="6" style="${TABLE_STYLE}">${thead}${tbody}</table>`;
}

function isTableStart(lines: string[], index: number): boolean {
  return Boolean(lines[index]?.includes('|') && lines[index + 1] && isTableSeparator(lines[index + 1]));
}

function renderParagraph(lines: string[]): string {
  return `<p style="${PARAGRAPH_STYLE}">${lines.map((line) => renderInline(line.trim())).join('<br />')}</p>`;
}

export function markdownToPublishHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = renderTable(tableLines);
      if (table) blocks.push(table);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level} style="${HEADING_STYLE}">${renderInline(headingMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li style="${TEXT_STYLE}">${renderInline(lines[i].replace(/^[-*]\s+/, '').trim())}</li>`);
        i++;
      }
      blocks.push(`<ul style="${LIST_STYLE}">${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li style="${TEXT_STYLE}">${renderInline(lines[i].replace(/^\d+\.\s+/, '').trim())}</li>`);
        i++;
      }
      blocks.push(`<ol style="${LIST_STYLE}">${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableStart(lines, i) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push(renderParagraph(paragraphLines));
  }

  return blocks.join('\n');
}
