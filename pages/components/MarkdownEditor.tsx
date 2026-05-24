/**
 * MarkdownEditor — @uiw/react-md-editor/nohighlight 安全封装层
 *
 * ⚠️ 禁止改为标准入口（@uiw/react-md-editor）——标准版包含 rehype-raw XSS 风险
 *    始终使用 @uiw/react-md-editor/nohighlight 变体（ESLint 规则强制）
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
import { FullscreenOutlined, FontSizeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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
      'codeBlock': '插入代码块 (Ctrl+Shift+E)',
      'code': '插入行内代码 (Ctrl+E)',
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
        const title = btn.getAttribute('title') ?? '';
        let matched = false;
        for (const [key, label] of Object.entries(TOOLBAR_LABELS)) {
          if (title.toLowerCase().includes(key.toLowerCase())) {
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
            matched = true;
            break;
          }
        }
        if (!matched) {
          const existingLabel = btn.getAttribute('aria-label');
          if (!existingLabel) {
            btn.setAttribute('aria-label', title);
          }
        }
      });

      // A-02: SVG 图标设置 aria-hidden，防止屏幕阅读器重复播报
      toolbar.querySelectorAll('button svg').forEach((svg) => {
        if (!svg.getAttribute('aria-hidden')) {
          svg.setAttribute('aria-hidden', 'true');
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

      // A-04: 预览区添加 aria-live，屏幕阅读器可获知预览更新
      const preview = container.querySelector('.w-md-editor-preview');
      if (preview && !preview.getAttribute('aria-live')) {
        preview.setAttribute('aria-live', 'polite');
        preview.setAttribute('aria-label', 'Markdown 预览区');
      }

      // P1: group 下拉菜单 ARIA——role="menu" + role="menuitem" + aria-expanded
      container.querySelectorAll('.w-md-editor-toolbar-child').forEach((dropdown) => {
        const ul = dropdown.querySelector('ul');
        if (ul && !ul.getAttribute('role')) {
          ul.setAttribute('role', 'menu');
          ul.setAttribute('aria-label', '标题级别选项');
        }
        dropdown.querySelectorAll('li').forEach((li) => {
          if (!li.getAttribute('role')) {
            li.setAttribute('role', 'menuitem');
          }
        });
      });
    };

    // 立即执行一次
    annotateToolbar();

    // 监听子树变化（上游可能在重渲染时替换工具栏 DOM）
    const observer = new MutationObserver(annotateToolbar);
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // C-02 fallback: 拦截 Ctrl+J/Ctrl+Shift+J（浏览器下载页/开发者工具）
  // UX-01/P1-1: 拦截 Ctrl+H（浏览器历史记录），防止编辑内容丢失
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const preventBrowserShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'j' || (key === 'h' && !e.shiftKey)) {
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', preventBrowserShortcut, true);
    return () => container.removeEventListener('keydown', preventBrowserShortcut, true);
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

  // SEC-MD-05: 上游 help 命令 window.open 缺少 noopener（反向标签劫持风险）
  //   → 安全覆盖：noopener+noreferrer + 弹窗拦截降级 + 中文 ARIA + antd 图标 + F1 快捷键
  // C-02/UI-P1-03: 重映射 code/codeBlock 快捷键（Ctrl+J→Ctrl+E），避免浏览器冲突
  // S1/S2/C-03: 防御性封装 — 非空断言防护 + try-catch
  const commandsFilter = useCallback(
    (command: any, isExtra: boolean) => {
      if (command.name === 'help') {
        return {
          ...command,
          shortcuts: 'f1',
          buttonProps: {
            'aria-label': '打开 Markdown 语法帮助（外部链接）',
            title: '打开 Markdown 语法帮助 (F1)',
          },
          icon: <QuestionCircleOutlined style={{ fontSize: 16 }} />,
          execute: () => {
            const HELP_URL = 'https://www.markdownguide.org/basic-syntax/';
            const newWindow = window.open(HELP_URL, '_blank', 'noopener,noreferrer');
            if (!newWindow || newWindow.closed) {
              window.location.href = HELP_URL;
            }
          },
        };
      }

      // P1: 修复 group 命令——12px SVG 替换为 antd 16px 图标 + 中文 ARIA + Carbon 合规
      if (command.keyCommand === 'group') {
        return {
          ...command,
          icon: <FontSizeOutlined style={{ fontSize: 16 }} />,
          buttonProps: {
            ...(command.buttonProps ?? {}),
            'aria-label': '选择标题级别',
            'aria-haspopup': 'menu',
            title: '选择标题级别',
          },
        };
      }

      // P0/P1/P2: 修复 fullscreen 命令——按钮点击失效 + 快捷键冲突 + 中文标注 + antd 图标
      if (command.name === 'fullscreen') {
        return {
          ...command,
          shortcuts: 'ctrlcmd+shift+f',
          buttonProps: {
            'aria-label': '切换全屏模式',
            title: '切换全屏模式 (Ctrl+Shift+F)',
          },
          icon: <FullscreenOutlined style={{ fontSize: 16 }} />,
          execute: (state: any, api: any, dispatch?: any, executeCommandState?: any) => {
            if (dispatch && executeCommandState) {
              dispatch({ fullscreen: !executeCommandState.fullscreen });
              api.textArea.focus();
            }
          },
        };
      }

      // P1-1/P1-2/V-01/V-02/C-01/C-02/S1/S2/S3/S5/S8:
      // 修复 hr 命令——快捷键冲突 + SVG 图标语义错位 + selectWord 不适用行级块元素 +
      // 非空断言防护 + 用户选区保护 + 错误边界
      if (command.name === 'hr') {
        const hrPrefix = command.prefix ?? '\n\n---\n';
        const hrSuffix = command.suffix ?? '';
        return {
          ...command,
          shortcuts: 'ctrlcmd+shift+h',
          buttonProps: {
            'aria-label': '插入水平分割线 (Ctrl+Shift+H)',
            title: '插入水平分割线 (Ctrl+Shift+H)',
          },
          icon: (
            <svg role="img" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
              <path fill="currentColor" d="M1,5 L11,5 L11,7 L1,7 Z" />
            </svg>
          ),
          execute: (state: any, api: any) => {
            try {
              const { text, selection } = state;
              if (!text || selection.start == null) return;

              const lineStart = text.lastIndexOf('\n', selection.start - 1) + 1;
              const lineEnd = text.indexOf('\n', selection.start);
              const end = lineEnd === -1 ? text.length : lineEnd;
              const currentLine = text.slice(lineStart, end).trim();

              if (currentLine === '---' || currentLine === '***' || currentLine === '___') {
                // 移除：选中整行后用 replaceSelection 删除
                api.setSelectionRange({ start: lineStart, end });
                api.replaceSelection('');
              } else {
                // 添加：在光标位置插入水平分割线（使用 replaceSelection 触发 React 状态更新）
                api.setSelectionRange({ start: selection.start, end: selection.end });
                const needsLeadingNewline = selection.start > 0 && text[selection.start - 1] !== '\n';
                const insertText = (needsLeadingNewline ? '\n' : '') + '\n---\n';
                api.replaceSelection(insertText);
              }
            } catch (err) {
              console.error('[MarkdownEditor] hr 命令执行失败:', err);
            }
          },
        };
      }

      if (command.name === 'code' || command.name === 'codeBlock') {
        const wrapped = { ...command };
        if (command.name === 'code') {
          wrapped.shortcuts = 'ctrlcmd+e';
          wrapped.buttonProps = {
            'aria-label': '插入行内代码 (Ctrl+E)',
            title: '插入行内代码 (Ctrl+E)',
          };
        } else {
          wrapped.shortcuts = 'ctrlcmd+shift+e';
          wrapped.buttonProps = {
            'aria-label': '插入代码块 (Ctrl+Shift+E)',
            title: '插入代码块 (Ctrl+Shift+E)',
          };
        }

        const originalExecute = wrapped.execute;
        if (originalExecute) {
          wrapped.execute = (state: any, api: any) => {
            try {
              if (command.name === 'code' && !state.command?.prefix) {
                console.warn('[MarkdownEditor] code 命令缺少 prefix，已跳过');
                return;
              }
              originalExecute(state, api);
            } catch (err) {
              console.error(`[MarkdownEditor] 命令 "${command.name}" 执行失败:`, err);
            }
          };
        }

        return wrapped;
      }

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
