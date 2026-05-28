import { useCallback } from 'react';
import { App, Form } from 'antd';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getApiErrorMessage } from '../../utils/error';

type FormInstance = ReturnType<typeof Form.useForm<import('../types').ArticleFormValues>>[0];

const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

function decodeText(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function normalizeInlineText(text: string): string {
  return decodeText(text).replace(/\s+/g, ' ').trim();
}

function escapeTableCell(text: string): string {
  return normalizeInlineText(text).replace(/\|/g, '\\|');
}

function tableToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((row) => Array.from(row.children)
      .filter((cell) => ['TH', 'TD'].includes(cell.tagName))
      .map((cell) => escapeTableCell(cell.textContent || '')))
    .filter((cells) => cells.length > 0);

  if (rows.length === 0) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizeRow = (row: string[]) => {
    const cells = [...row];
    while (cells.length < columnCount) cells.push('');
    return `| ${cells.slice(0, columnCount).join(' | ')} |`;
  };
  const [header, ...body] = rows;

  return [
    normalizeRow(header),
    `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`,
    ...body.map(normalizeRow),
  ].join('\n');
}

function listToMarkdown(list: HTMLOListElement | HTMLUListElement): string {
  return Array.from(list.children)
    .filter((child) => child.tagName === 'LI')
    .map((child, index) => {
      const marker = list.tagName === 'OL' ? `${index + 1}.` : '-';
      return `${marker} ${normalizeInlineText(child.textContent || '')}`;
    })
    .join('\n');
}

function htmlToMarkdown(html: string): string {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'],
    ALLOWED_ATTR: [],
  });
  const container = document.createElement('div');
  container.innerHTML = cleanHtml;

  const blocks: string[] = [];
  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeInlineText(node.textContent || '');
      if (text) blocks.push(text);
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    const text = normalizeInlineText(node.textContent || '');
    switch (node.tagName) {
      case 'H1':
        if (text) blocks.push(`# ${text}`);
        break;
      case 'H2':
        if (text) blocks.push(`## ${text}`);
        break;
      case 'H3':
        if (text) blocks.push(`### ${text}`);
        break;
      case 'P':
        if (text) blocks.push(text);
        break;
      case 'UL':
      case 'OL': {
        const markdown = listToMarkdown(node as HTMLUListElement | HTMLOListElement);
        if (markdown) blocks.push(markdown);
        break;
      }
      case 'TABLE': {
        const markdown = tableToMarkdown(node as HTMLTableElement);
        if (markdown) blocks.push(markdown);
        break;
      }
      default:
        if (text) blocks.push(text);
    }
  });

  return blocks.join('\n\n').trim();
}

export function useDocumentImport(
  form: FormInstance,
  onContentImport: (content: string) => void,
) {
  const { message } = App.useApp();

  const importDocument = useCallback(async (file: File) => {
    if (file.size > MAX_IMPORT_SIZE) {
      message.error(`文件大小不能超过 10MB（当前: ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
      return false;
    }
    try {
      let markdown = '';
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'md') {
        const rawText = await file.text();
        markdown = rawText
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, (match) => {
            if (/^<(br|hr|em|strong|code|pre)\s*\/?>$/i.test(match.trim())) return match;
            return '';
          });
      } else if (ext === 'docx' || ext === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        markdown = htmlToMarkdown(result.value);
      } else {
        message.error('仅支持 .md、.doc、.docx 格式');
        return false;
      }

      if (!markdown.trim()) {
        message.warning('文档内容为空');
        return false;
      }

      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        form.setFieldValue('title', titleMatch[1].trim());
        markdown = markdown.replace(/^#\s+.+\n?/, '').trim();
      }

      onContentImport(markdown);
      message.success(`已导入文档「${file.name}」`);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '文档解析失败'));
    }
    return false;
  }, [form, onContentImport, message]);

  return { importDocument };
}
