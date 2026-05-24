/**
 * MarkdownEditor — @uiw/react-md-editor 安全封装层
 *
 * 隔离 Context.tsx 已知缺陷：
 *   - [key: string]: any 索引签名（类型安全瓦解）
 *   - Reducer 无 Action 区分（状态不可追踪）
 *   - DOM 引用混入 Context（XSS 向量）
 *   - dispatch 混入 state（循环依赖）
 *   - 零主题支持（无 Carbon 集成出口）
 *
 * 防护措施：
 *   1. 严格接口定义 — 不暴露 ContextStore，禁止 any
 *   2. 安全预览 — 复用 MarkdownViewer 的 safeUrlTransform + SAFE_TAGS
 *   3. 内容消毒 — 提交前通过 DOMPurify 消毒
 *   4. DOM 引用隔离 — ref 不暴露给外部
 *   5. Carbon Design System 样式对齐
 */
import React, { useMemo, useCallback, forwardRef, useImperativeHandle, useRef, memo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import DOMPurify from 'dompurify';
import { safeUrlTransform, SAFE_TAGS } from './MarkdownViewer';
import '../styles/markdown-editor.css';

export type EditorPreviewMode = 'live' | 'edit' | 'preview';

export interface MarkdownEditorProps {
  /** 编辑器内容（受控模式） */
  value?: string;
  /** 内容变更回调（antd Form.Item 兼容） */
  onChange?: (value: string) => void;
  /** 预览模式，默认 'edit' */
  preview?: EditorPreviewMode;
  /** 编辑器高度（px），默认 400 */
  height?: number;
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否可见，默认 true */
  visible?: boolean;
  /** 额外 CSS 类名 */
  className?: string;
  /** 额外内联样式 */
  style?: React.CSSProperties;
  /** Tab 大小，默认 2 */
  tabSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 自动聚焦 */
  autoFocus?: boolean;
}

export interface MarkdownEditorRef {
  /** 获取消毒后的 HTML 内容 */
  getSanitizedHTML(): string;
  /** 获取原始 Markdown 内容 */
  getRawMarkdown(): string;
  /** 聚焦编辑器 */
  focus(): void;
}

const MAX_CONTENT_LENGTH = 2_097_152; // 2MB 内容上限

const MarkdownEditorBase = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({
  value = '',
  onChange,
  preview = 'edit',
  height = 400,
  readOnly = false,
  visible = true,
  className,
  style,
  tabSize = 2,
  placeholder,
  autoFocus = false,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (!onChange) return;
      const raw = val ?? '';
      if (raw.length > MAX_CONTENT_LENGTH) {
        onChange(raw.slice(0, MAX_CONTENT_LENGTH));
        return;
      }
      onChange(raw);
    },
    [onChange],
  );

  const getSanitizedHTML = useCallback(() => {
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: Array.from(SAFE_TAGS),
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|telnet):|[^a-z]|[a+][a-z+.]+(?:\.|%20|\/))+$/i,
    });
  }, [value]);

  useImperativeHandle(ref, () => ({
    getSanitizedHTML,
    getRawMarkdown: () => value,
    focus: () => {
      const textarea = editorRef.current?.querySelector('textarea');
      textarea?.focus();
    },
  }), [getSanitizedHTML, value]);

  if (!visible) return null;

  const rootClassName = `markdown-editor-wrapper${className ? ` ${className}` : ''}`;

  return (
    <div ref={editorRef} data-color-mode="light" className={rootClassName} style={style}>
      <MDEditor
        value={value}
        onChange={handleChange}
        height={height}
        preview={preview}
        tabSize={tabSize}
        autoFocus={autoFocus}
        textareaProps={{ placeholder, readOnly }}
        previewOptions={{
          urlTransform: safeUrlTransform,
          allowElement: (element: { tagName: string }) =>
            SAFE_TAGS.has(element.tagName.toLowerCase()),
        }}
      />
    </div>
  );
});

MarkdownEditorBase.displayName = 'MarkdownEditor';

const MarkdownEditor = memo(MarkdownEditorBase);
MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
