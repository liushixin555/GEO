import { useCallback } from 'react';
import { App, Form } from 'antd';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getApiErrorMessage } from '../../utils/error';

type FormInstance = ReturnType<typeof Form.useForm<import('../types').ArticleFormValues>>[0];

const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

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
        const cleanHtml = DOMPurify.sanitize(result.value, {
          ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
          ALLOWED_ATTR: [],
        });
        markdown = cleanHtml
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
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
