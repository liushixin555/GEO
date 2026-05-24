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
import React, { useCallback, useEffect, forwardRef, useImperativeHandle, useRef, memo } from 'react';
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

  // 上游 Editor.factory.tsx:154-163 使用 useMemo 注册 mouseover/mouseleave 事件监听器但无清理函数，
  // 组件卸载时手动清理 DOM 引用，帮助 GC 回收并缓解事件监听器泄漏（SEC-MD-04）
  useEffect(() => {
    return () => {
      const container = editorRef.current;
      if (container) {
        const textareaWarp = container.querySelector('.w-md-editor-text');
        if (textareaWarp && textareaWarp instanceof HTMLElement) {
          const clone = textareaWarp.cloneNode(false);
          textareaWarp.parentNode?.replaceChild(clone, textareaWarp);
        }
      }
    };
  }, []);

  // 上游工具栏按钮缺少 aria-label，屏幕阅读器无法识别（A-01）
  // 在 mount 后为工具栏容器添加 role="toolbar" + aria-label，为按钮添加 aria-label
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const toolbar = container.querySelector('.w-md-editor-toolbar');
    if (toolbar) {
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Markdown 格式化工具栏');
    }

    const TOOLBAR_LABELS: Record<string, string> = {
      'header': '标题',
      'bold': '粗体',
      'italic': '斜体',
      'strikethrough': '删除线',
      'hr': '分隔线',
      'title': '标题',
      'link': '链接',
      'quote': '引用',
      'code': '代码',
      'codeBlock': '代码块',
      'image': '图片',
      'unorderedListCommand': '无序列表',
      'orderedListCommand': '有序列表',
      'checkedListCommand': '任务列表',
      'live': '实时预览',
      'edit': '编辑模式',
      'preview': '预览模式',
      'fullscreen': '全屏',
    };

    if (!toolbar) return;

    const buttons = toolbar.querySelectorAll('button[title]');
    buttons.forEach((btn) => {
      const title = btn.getAttribute('title') ?? '';
      for (const [key, label] of Object.entries(TOOLBAR_LABELS)) {
        if (title.toLowerCase().includes(key.toLowerCase())) {
          btn.setAttribute('aria-label', label);
          break;
        }
      }
      if (!btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', title);
      }
    });
  });

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

  // 上游 help 命令使用 window.open 缺少 noopener，存在 Tabnabbing 风险（SEC-MD-05）
  const commandsFilter = useCallback(
    (command: { name?: string }, isExtra: boolean) => {
      if (command.name === 'help') return false;
      return command;
    },
    [],
  );

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
        textareaProps={{ placeholder, readOnly, 'aria-label': 'Markdown 编辑器' }}
        commandsFilter={commandsFilter}
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
