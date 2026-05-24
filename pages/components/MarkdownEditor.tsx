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
import MDEditor from '@uiw/react-md-editor/nohighlight';
import DOMPurify from 'dompurify';
import { Empty } from 'antd';
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

// REQ-4: Error Boundary 防止 Markdown 渲染崩溃导致页面白屏
interface EditorErrorBoundaryState {
  hasError: boolean;
}

class MarkdownEditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EditorErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MarkdownEditorErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <Empty description="编辑器加载异常，请刷新页面重试" />;
    }
    return this.props.children;
  }
}

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
  const editorRef = useRef<HTMLDivElement | null>(null);

  // REQ-2: 组件卸载时清理 DOM 引用和事件监听器
  // 上游 Editor.factory.tsx:154-163 使用 useMemo 注册 mouseover/mouseleave 但无清理
  useEffect(() => {
    return () => {
      const container = editorRef.current;
      if (!container) return;

      // 清理上游泄漏的事件监听器：通过替换 textareaWarp DOM 节点移除所有匿名监听器
      const textareaWarp = container.querySelector('.w-md-editor-text');
      if (textareaWarp && textareaWarp instanceof HTMLElement) {
        const clone = textareaWarp.cloneNode(false);
        textareaWarp.parentNode?.replaceChild(clone, textareaWarp);
      }

      // 清理容器引用，帮助 GC
      editorRef.current = null;
    };
  }, []);

  // 上游工具栏按钮缺少 aria-label（A-01），缺少 role="toolbar"（REQ-6）
  // 使用 MutationObserver 监听 DOM 变化后注入 ARIA 属性，避免每次渲染执行
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

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

    const annotateToolbar = () => {
      const toolbar = container.querySelector('.w-md-editor-toolbar');
      if (!toolbar) return;

      if (!toolbar.getAttribute('role')) {
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Markdown 格式化工具栏');
      }

      const buttons = toolbar.querySelectorAll('button[title]');
      buttons.forEach((btn) => {
        if (btn.getAttribute('aria-label')) return;
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

      // REQ-6: 为拖拽条添加无障碍属性
      const dragBar = container.querySelector('.w-md-editor-drag');
      if (dragBar && !dragBar.getAttribute('role')) {
        dragBar.setAttribute('role', 'separator');
        dragBar.setAttribute('aria-orientation', 'horizontal');
        dragBar.setAttribute('aria-label', '调整编辑器高度');
        (dragBar as HTMLElement).tabIndex = 0;
      }
    };

    // 立即执行一次
    annotateToolbar();

    // 监听子树变化（上游可能在重渲染时替换工具栏 DOM）
    const observer = new MutationObserver(annotateToolbar);
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

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

  // OPT-5: 点击事件隔离，防止编辑器内部点击冒泡到 antd Form 等父组件
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!visible) return null;

  const rootClassName = `markdown-editor-wrapper${className ? ` ${className}` : ''}`;

  return (
    <MarkdownEditorErrorBoundary>
      <div
        ref={editorRef}
        data-color-mode="light"
        className={rootClassName}
        style={style}
        role="application"
        aria-label="Markdown 编辑器"
        onClick={handleContainerClick}
      >
        <MDEditor
          value={value}
          onChange={handleChange}
          height={height}
          preview={preview}
          tabSize={tabSize}
          autoFocus={autoFocus}
          textareaProps={{ placeholder, readOnly, 'aria-label': 'Markdown 内容编辑区' }}
          commandsFilter={commandsFilter}
          previewOptions={{
            urlTransform: safeUrlTransform,
            allowElement: (element: { tagName: string }) =>
              SAFE_TAGS.has(element.tagName.toLowerCase()),
          }}
        />
      </div>
    </MarkdownEditorErrorBoundary>
  );
});

MarkdownEditorBase.displayName = 'MarkdownEditor';

const MarkdownEditor = memo(MarkdownEditorBase);
MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
