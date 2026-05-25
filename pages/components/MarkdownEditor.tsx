/**
 * MarkdownEditor — @uiw/react-md-editor/nohighlight 安全封装层
 *
 * ⚠️ 禁止改为标准入口（@uiw/react-md-editor）——标准版包含 rehype-raw XSS 风险
 *    始终使用 @uiw/react-md-editor/nohighlight 变体（ESLint 规则强制）
 *
 * Context.tsx 安全缺陷及修复状态（via patches/@uiw+react-md-editor+4.1.0.patch）：
 *   - SEC-CTX-01 ✅ [key: string]: any 索引签名已移除
 *   - SEC-CTX-02 ⚠️ DOM 引用混入 Context——结构性限制，库内部依赖；本封装层隔离不暴露
 *   - SEC-CTX-03 ⚠️ dispatch 混入 state——结构性限制，库内部依赖；本封装层隔离不暴露
 *   - SEC-CTX-04 ✅ Reducer 白名单过滤——运行时只合并已知键，拒绝任意属性注入
 *   - SEC-CTX-05 ✅ Context 默认值补全——preview/fullscreen/highlightEnable 等完整初始化
 *   - 零主题支持（无 Carbon 集成出口）
 *
 * 防护措施：
 *   1. 严格接口定义 — 不暴露 ContextStore，禁止 any
 *   2. 安全预览 — 复用 MarkdownViewer 的 safeUrlTransform + SAFE_TAGS
 *   3. 内容消毒 — 提交前通过 DOMPurify 消毒
 *   4. DOM 引用隔离 — ref 不暴露给外部
 *   5. Carbon Design System 样式对齐
 *   6. Reducer 白名单 — 运行时拒绝未知键注入（patch 修复）
 */
import React, { useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useRef, useState, memo } from 'react';
import MDEditor from '@uiw/react-md-editor/nohighlight';
import DOMPurify from 'dompurify';
import { Empty } from 'antd';
import { FullscreenOutlined, FontSizeOutlined, QuestionCircleOutlined, LinkOutlined, EditOutlined, SplitCellsOutlined, EyeOutlined, CommentOutlined } from '@ant-design/icons';
import { safeUrlTransform, SAFE_TAGS, SAFE_INPUT_TYPES } from './MarkdownViewer';
import '../styles/markdown-editor.css';

// rehypeRewrite 属性清理常量（与 MarkdownViewer 保持一致）
const DANGEROUS_ATTR_RE = /^on/i;
const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;
const URL_PROPERTIES = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href',
  'poster', 'background', 'dynsrc', 'lowsrc',
]);

export type EditorPreviewMode = 'live' | 'edit' | 'preview';

export type EditorSize = 'small' | 'middle' | 'large';

export interface MarkdownEditorProps {
  /** 编辑器内容（受控模式） */
  value?: string;
  /** 内容变更回调（antd Form.Item 兼容） */
  onChange?: (value: string) => void;
  /** 预览模式，默认 'edit' */
  preview?: EditorPreviewMode;
  /** 编辑器高度（px），默认 400；设置 size 后此值被覆盖 */
  height?: number;
  /** 编辑器尺寸，映射到高度：small=200 / middle=400 / large=600，与 antd Form size 对齐 */
  size?: EditorSize;
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

// A-01: size 到高度的映射，与 antd Form 组件的 size prop 保持一致
const SIZE_HEIGHT_MAP: Record<EditorSize, number> = {
  small: 200,
  middle: 400,
  large: 600,
};

// ARCH-H2: help 命令配置常量——集中管理 URL / 窗口特性，便于企业级定制
const HELP_URL = 'https://www.markdownguide.org/basic-syntax/';
const HELP_WINDOW_FEATURES = 'noopener,noreferrer';

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
  height: heightProp,
  size,
  readOnly = false,
  visible = true,
  className,
  style,
  tabSize = 2,
  placeholder,
  autoFocus = false,
}, ref) => {
  // A-01: size prop 优先，否则使用 height prop（默认 400）
  const minHeight = size ? SIZE_HEIGHT_MAP[size] : (heightProp ?? 400);
  const editorRef = useRef<HTMLDivElement | null>(null);
  // 激活模式高亮：追踪当前 preview prop，供 annotateToolbar 读取
  const previewRef = useRef(preview);
  previewRef.current = preview;

  // 自适应高度：实时测量并扩展编辑器高度，确保内容不出现滚动条
  const [autoHeight, setAutoHeight] = useState(minHeight);
  const autoHeightRef = useRef(minHeight);

  const syncEditorHeight = useCallback(() => {
    const container = editorRef.current;
    if (!container) return;
    const textarea = container.querySelector('textarea');
    if (!textarea) return;
    // 临时收缩 textarea 以获取真实内容高度
    const savedHeight = textarea.style.height;
    textarea.style.height = '0';
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = savedHeight;
    const toolbar = container.querySelector('.w-md-editor-toolbar') as HTMLElement | null;
    const toolbarH = toolbar ? toolbar.offsetHeight : 38;
    const dragBar = container.querySelector('.w-md-editor-drag') as HTMLElement | null;
    const dragH = dragBar ? dragBar.offsetHeight : 6;
    const needed = Math.max(minHeight, contentHeight + toolbarH + dragH + 16);
    // 直接 DOM 操作——零延迟，浏览器在 paint 前完成高度调整
    const mdEditor = container.querySelector('.w-md-editor') as HTMLElement | null;
    if (mdEditor) {
      mdEditor.style.height = `${needed}px`;
    }
    // 同步 React 状态（供 MDEditor height prop 使用）
    if (autoHeightRef.current !== needed) {
      autoHeightRef.current = needed;
      setAutoHeight(needed);
    }
  }, [minHeight]);

  // useLayoutEffect: 在浏览器 paint 前同步调整高度，用户不会看到滚动条闪烁
  useLayoutEffect(() => {
    syncEditorHeight();
  }, [value, minHeight, preview, syncEditorHeight]);

  // 原生 input 事件监听：用户每次按键立即触发高度调整，不等待 React 渲染
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;
    const textarea = container.querySelector('textarea');
    if (!textarea) return;
    textarea.addEventListener('input', syncEditorHeight);
    return () => textarea.removeEventListener('input', syncEditorHeight);
  }, [syncEditorHeight]);

  // UX-03: 全屏模式 Escape 退出提示状态
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);

  // REQ-2: 组件卸载时清理容器引用，帮助 GC
  // 注意：禁止在 cleanup 中使用 cloneNode(false) + replaceChild 替换 DOM 节点，
  // React.StrictMode 会在 remount 前执行 cleanup，导致 React reconciler 丢失子树引用，
  // textarea 无法重新渲染。上游 mouseover/mouseleave 监听器随 DOM 节点自然回收。
  useEffect(() => {
    return () => {
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
      'bold': '粗体 (Ctrl+B)',
      'italic': '斜体 (Ctrl+I)',
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
      'table': '插入表格',
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
          if (title.toLowerCase().includes(key.toLowerCase()) || title.includes(label)) {
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
            // UX-01: CSS tooltip 数据属性，配合 CSS 伪元素实现快速显示的悬停提示
            btn.setAttribute('data-tooltip', label);
            matched = true;
            break;
          }
        }
        if (!matched) {
          const existingLabel = btn.getAttribute('aria-label');
          if (!existingLabel) {
            btn.setAttribute('aria-label', title);
          }
          // UX-01: 未匹配标准标签时，仍添加 data-tooltip 以统一 tooltip 行为
          btn.setAttribute('data-tooltip', title);
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

      // 激活模式按钮高亮——根据当前 preview 模式设置 data-mode-active 属性
      // CSS 已定义 data-mode-active="true" 样式（Carbon product-tab 视觉规范）
      const modeLabels: Record<string, string> = {
        edit: '编辑模式',
        live: '实时预览',
        preview: '预览模式',
      };
      const activeLabel = modeLabels[previewRef.current];
      toolbar.querySelectorAll('button').forEach((btn) => {
        const title = btn.getAttribute('title') ?? '';
        if (activeLabel && title.includes(activeLabel)) {
          btn.setAttribute('data-mode-active', 'true');
        } else if (btn.hasAttribute('data-mode-active')) {
          btn.removeAttribute('data-mode-active');
        }
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
          // UI-P1-01: 拦截 Ctrl+L 防止浏览器选中地址栏导致焦点跳走
          // title3.tsx review: 拦截 Ctrl+1-6 防止浏览器切换标签页（与 heading 命令快捷键冲突）
          // commands-preview.tsx review: 拦截 Ctrl+7-9 防止浏览器切换标签页（与 preview 命令快捷键冲突）
          const interceptedNumKeys = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
          if (key === 'j' || key === 'l' || (key === 'h' && !e.shiftKey) || (key === 'q' && !e.shiftKey) || interceptedNumKeys.has(key)) {
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', preventBrowserShortcut, true);
    return () => container.removeEventListener('keydown', preventBrowserShortcut, true);
  }, []);

  // UX-03: 全屏模式 Escape 退出提示——监听 .w-md-editor-fullscreen 类变化
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const checkFullscreen = () => {
      const isFullscreen = container.querySelector('.w-md-editor-fullscreen') != null;
      if (isFullscreen) {
        setShowFullscreenHint(true);
        setTimeout(() => setShowFullscreenHint(false), 2000);
      }
    };

    const observer = new MutationObserver(checkFullscreen);
    observer.observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });

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

  // SEC-MD-05: 上游 help 命令 window.open 缺少 noopener（反向标签劫持风险）
  //   → 安全覆盖：noopener+noreferrer + 弹窗拦截降级 + 中文 ARIA + antd 图标 + F1 快捷键
  // C-02/UI-P1-03: 重映射 code/codeBlock 快捷键（Ctrl+J→Ctrl+E），避免浏览器冲突
  // S1/S2/C-03: 防御性封装 — 非空断言防护 + try-catch
  const commandsFilter = useCallback(
    (command: any, isExtra: boolean) => {
      // ARCH-H1/H2/M2/L2: help 命令安全覆盖——
      //   1. SSR 环境检测（typeof window !== 'undefined'），防止 Node.js 运行时崩溃
      //   2. 常量提取（HELP_URL / HELP_WINDOW_FEATURES），便于企业内网/内部文档定制
      //   3. try-catch 错误边界，防止 window.open 异常冒泡至 orchestrator
      //   4. 弹窗拦截降级 + console.warn 可观测性
      //   5. noopener+noreferrer 防反向标签劫持
      //   6. F1 快捷键 + 中文 ARIA + antd 图标
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
            try {
              // ARCH-H1: SSR 安全——window 在 Node.js 中不存在
              if (typeof window === 'undefined') return;
              const newWindow = window.open(HELP_URL, '_blank', HELP_WINDOW_FEATURES);
              if (!newWindow || newWindow.closed) {
                // ARCH-M2: 弹窗拦截降级——同窗口导航 + 可观测性日志
                console.warn('[MarkdownEditor] help 命令: 弹窗被拦截，降级为同窗口导航');
                window.location.href = HELP_URL;
              }
            } catch (err) {
              // ARCH-L2: 错误边界——防止 CSP 策略等异常冒泡至 orchestrator
              console.error('[MarkdownEditor] help 命令执行失败:', err);
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

      // P2-01/A-01/I18N-01: 覆盖 heading1~6 命令——中文 ARIA + 图标文本 HN + prefix! 防御
      if (command.name?.startsWith('heading') && /^heading[1-6]$/.test(command.name)) {
        const level = command.name.replace('heading', '');
        const levelNum = Number(level);
        const originalExecute = command.execute;
        return {
          ...command,
          icon: <span aria-hidden="true" style={{ fontSize: Math.max(12, 20 - levelNum * 2), fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}>H{level}</span>,
          buttonProps: {
            'aria-label': `${level}级标题 (Ctrl+${level})`,
            title: `${level}级标题 (Ctrl+${level})`,
          },
          execute: (state: any, api: any) => {
            try {
              if (!state.command?.prefix) return;
              if (!state.text || typeof state.text !== 'string') return;
              const { start, end } = state.selection ?? {};
              if (start == null || end == null || start < 0 || end < start || end > state.text.length) return;
              originalExecute?.(state, api);
            } catch (err) {
              console.error(`[MarkdownEditor] 命令 "${command.name}" 执行失败:`, err);
            }
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

      // QUALITY-M1/M2/QUALITY-L3~L4/SEC-M1/SEC-L2~L4/ARCH-H1~H2/ARCH-M2/UI-P2~P3:
      // 覆盖 table 命令——toggle 移除分支为死代码（编辑后 startsWith 必然失败） +
      // selectWord 无法处理多行块级内容 + 4 处 prefix! 非空断言掩盖运行时风险 +
      // 选区范围未验证 + 超长文本无 DoS 防护 + 圈复杂度 3（命令簇最高） +
      // 无快捷键 + SVG 缺少 title/aria-hidden + 英文标签/占位文本硬编码
      if (command.name === 'table') {
        return {
          ...command,
          shortcuts: 'ctrlcmd+shift+t',
          buttonProps: {
            'aria-label': '插入表格 (Ctrl+Shift+T)',
            title: '插入表格 (Ctrl+Shift+T)',
          },
          icon: (
            <svg role="img" aria-hidden="true" width="16" height="16" viewBox="0 0 512 512" focusable="false">
              <title>表格</title>
              <path
                fill="currentColor"
                d="M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"
              />
            </svg>
          ),
          // ARCH-H1/H2: 重写为纯模板插入管道——无 toggle、无 selectWord，圈复杂度 1
          execute: (state: any, api: any) => {
            try {
              const { text, selection } = state;
              // SEC-L3: 超长文本防护（注意：空字符串 '' 应允许插入）
              if (text == null || typeof text !== 'string' || text.length > 1_000_000) return;
              // QUALITY-L3/SEC-M1: 防御性检查
              if (selection?.start == null) return;
              // SEC-L2: 选区边界校验
              const safeStart = Math.max(0, Math.min(selection.start, text.length));
              if (safeStart > (selection.end ?? safeStart)) return;

              // 中文模板（UI-P3: 占位文本中文化）
              const TABLE_TEMPLATE = '\n| 表头 | 表头 |\n|------|------|\n| 内容 | 内容 |\n| 内容 | 内容 |\n| 内容 | 内容 |\n';

              // 检测光标是否在表格行内 → 插入前加空行分隔
              const lineStart = text.lastIndexOf('\n', safeStart - 1) + 1;
              const lineEnd = text.indexOf('\n', safeStart);
              const currentLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
              const needsSeparator = currentLine.startsWith('|') && currentLine.length > 1;

              api.setSelectionRange({ start: safeStart, end: safeStart });
              api.replaceSelection(needsSeparator ? '\n' + TABLE_TEMPLATE : TABLE_TEMPLATE);
            } catch (err) {
              console.error('[MarkdownEditor] table 命令执行失败:', err);
            }
          },
        };
      }

      // P1-1/P1-2/P1-3/P1-4/S1/S2/S3/S4/S6/UI-P1-01~04/UI-P2-01/ARCH-2.1:
      // 覆盖 image 命令——快捷键冲突 + URL 检测误判/XSS + SVG 无障碍 + 非空断言崩溃 +
      // alt 文本注入 + 选区越界 + 缺少 re-select
      if (command.name === 'image') {
        return {
          ...command,
          shortcuts: 'ctrlcmd+shift+k',
          buttonProps: {
            'aria-label': '插入图片 (Ctrl+Shift+K)',
            title: '插入图片 (Ctrl+Shift+K)',
          },
          icon: (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M14 2H2C1.4 2 1 2.4 1 3v10c0 .6.4 1 1 1h12c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1zm0 11H2V3h12v10zM5.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13 11H3l2.5-3L8 11l2.5-3.5L13 11z"
              />
            </svg>
          ),
          execute: (state: any, api: any) => {
            try {
              const { text, selection } = state;
              if (!text || selection.start == null) return;

              const safeStart = Math.max(0, Math.min(selection.start, text.length));
              const safeEnd = Math.max(safeStart, Math.min(selection.end, text.length));

              api.setSelectionRange({ start: safeStart, end: safeEnd });
              const selectedText = text.substring(safeStart, safeEnd);
              const trimmed = selectedText.trim();

              const URL_RE = /^https?:\/\/[^\s)]+$/i;

              if (trimmed.length > 0 && URL_RE.test(trimmed)) {
                api.replaceSelection(`![image](${trimmed})`);
              } else if (trimmed.length === 0) {
                api.replaceSelection('![image](url)');
              } else {
                const escaped = trimmed.replace(/[[\]()!\\]/g, '\\$&');
                api.replaceSelection(`![${escaped}]()`);
              }
            } catch (err) {
              console.error('[MarkdownEditor] image 命令执行失败:', err);
            }
          },
        };
      }

      // P1-1~P1-4/S1~S5/UI-P1-01~04/UI-P2-01~06/UI-P3-01~03/ARCH-M1~M3:
      // 覆盖 link 命令——Ctrl+L 快捷键与浏览器地址栏冲突 + 非行业标准 +
      // javascript: URL 穿透渲染层 XSS + URL 分支空链接文本 WCAG 2.4.4 违规 +
      // SVG data-name="italic" 复制粘贴错误 + URL 检测 includes('http') 误判/漏判 +
      // prefix! 非空断言崩溃 + SVG 缺 aria-hidden + 12px 图标过小 + 英文 ARIA
      if (command.name === 'link') {
        return {
          ...command,
          shortcuts: 'ctrlcmd+k',
          buttonProps: {
            'aria-label': '插入链接 (Ctrl+K)',
            title: '插入链接 (Ctrl+K)',
          },
          icon: <LinkOutlined style={{ fontSize: 16 }} />,
          execute: (state: any, api: any) => {
            try {
              const { text, selection } = state;
              if (!text || selection.start == null) return;

              const safeStart = Math.max(0, Math.min(selection.start, text.length));
              const safeEnd = Math.max(safeStart, Math.min(selection.end, text.length));

              api.setSelectionRange({ start: safeStart, end: safeEnd });
              const selectedText = text.substring(safeStart, safeEnd);
              const trimmed = selectedText.trim();

              const URL_RE = /^(https?:\/\/|ftp:\/\/|ftps:\/\/|\/\/|www\.)[^\s]+$/i;
              const SAFE_URL_SCHEMES = new Set(['http', 'https', 'ftp', 'ftps', 'mailto', 'tel']);

              if (trimmed.length > 0 && URL_RE.test(trimmed)) {
                // S1: URL 方案白名单过滤，拦截 javascript:/data:/vbscript: 穿透渲染层
                const checkUrl = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
                if (checkUrl.includes(':') && !checkUrl.startsWith('//')) {
                  const scheme = checkUrl.split(':')[0].toLowerCase();
                  if (!SAFE_URL_SCHEMES.has(scheme)) {
                    console.warn('[MarkdownEditor] link 命令拒绝不安全的 URL 方案:', trimmed);
                    return;
                  }
                }
                // UI-P1-03: 从 URL 提取域名作为默认链接文本（消除空链接文本 WCAG 违规）
                let linkLabel = trimmed;
                try {
                  const urlObj = new URL(checkUrl);
                  linkLabel = urlObj.hostname;
                } catch {
                  linkLabel = trimmed;
                }
                api.replaceSelection(`[${linkLabel}](${trimmed})`);
              } else if (trimmed.length === 0) {
                // 空选区分支：插入中文占位符模板
                api.replaceSelection('[链接文本](url)');
              } else {
                // 文本包裹分支：选中文本作为链接文本
                const escaped = trimmed.replace(/[[\]\\]/g, '\\$&');
                api.replaceSelection(`[${escaped}](url)`);
              }
            } catch (err) {
              console.error('[MarkdownEditor] link 命令执行失败:', err);
            }
          },
        };
      }

      // P1/P2/P3/P4/P5: comment 命令防御性覆盖
      //   P1 — prefix! 非空断言：前置 prefix/suffix 空值守卫，消除运行时 undefined 风险
      //   P2 — 嵌套注释无防护：检测选区是否已在 <!-- ... --> 内，防止产生 <!-- <!-- --> --> 无效注释
      //   P3 — SVG polygon 冗余节点：替换为 antd CommentOutlined 图标
      //   P4 — suffix 可选类型使用不一致：与 prefix 统一做非空校验
      //   P5 — aria-label 英文硬编码：替换为中文 ARIA 标签
      if (command.name === 'comment') {
        return {
          ...command,
          buttonProps: {
            'aria-label': '插入/取消注释 (Ctrl+/)',
            title: '插入/取消注释 (Ctrl+/)',
          },
          icon: <CommentOutlined style={{ fontSize: 16 }} />,
          execute: (state: any, api: any) => {
            try {
              // P1/P4: prefix/suffix 防御性检查——尊重 ICommand 接口的可选性
              const prefix = state.command?.prefix;
              const suffix = state.command?.suffix;
              if (!prefix || !suffix) return;

              // 输入边界校验
              const { text, selection } = state;
              if (!text || typeof text !== 'string') return;
              if (selection?.start == null || selection.end == null) return;
              if (selection.start < 0 || selection.end < selection.start || selection.end > text.length) return;

              const originalExecute = command.execute;
              if (!originalExecute) return;

              // P2: 嵌套注释防护——检测选区前后是否已有 <!-- ... --> 包裹
              const PREFIX = '<!-- ';
              const SUFFIX = ' -->';
              const selStart = selection.start;
              const selEnd = selection.end;

              // 检查选区是否完全处于一个已有注释块内
              const beforeStart = Math.max(0, selStart - PREFIX.length);
              const beforeText = text.slice(beforeStart, selStart);
              const afterEnd = Math.min(text.length, selEnd + SUFFIX.length);
              const afterText = text.slice(selEnd, afterEnd);

              if (beforeText === PREFIX && afterText === SUFFIX) {
                // 已在注释块内：扩展选区覆盖整个注释标记，然后手动取消注释
                const expandedStart = selStart - PREFIX.length;
                const expandedEnd = selEnd + SUFFIX.length;
                api.setSelectionRange({ start: expandedStart, end: expandedEnd });
                const innerText = text.slice(selStart, selEnd);
                api.replaceSelection(innerText);
                return;
              }

              originalExecute(state, api);
            } catch (err) {
              console.error('[MarkdownEditor] comment 命令执行失败:', err);
            }
          },
        };
      }

      // S1/S2/S3/S4/S5: issue 命令防御性覆盖
      //   S1 — prefix! 非空断言：前置 prefix 空值守卫，尊重 ICommand 接口可选性
      //   S2 — 无错误边界：try-catch 防止 selectWord/executeCommand 异常冒泡至编排层
      //   S3 — selectWord 返回值未校验：选区范围四维校验 + text 类型检查
      //   S4 — # 与 Markdown H1~H6 标题语义碰撞：正则检测当前行标题模式，跳过以保护文档结构
      //   S5 — prefix/suffix 防御策略不一致：统一通过 prefix 空值守卫 + suffix 原样透传
      //   S6 — 命令未被默认工具栏注册（信息级），死代码安全缺陷已被封装层覆盖
      if (command.name === 'issue') {
        const originalExecute = command.execute;
        return {
          ...command,
          buttonProps: {
            'aria-label': '插入 Issue 引用 (#)',
            title: '插入 Issue 引用 (#)',
          },
          icon: (
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 448 512">
              <title>Issue 引用</title>
              <path
                fill="currentColor"
                d="M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L197.8 128l95.1 0 11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L357.8 128l58.2 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-68.9 0L325.8 320l58.2 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-68.9 0-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.8-58.7-95.1 0-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8L90.2 384 32 384c-17.7 0-32-14.3-32-32s14.3-32 32-32l68.9 0 21.3-128L64 192c-17.7 0-32-14.3-32-32s14.3-32 32-32l68.9 0 11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3zM187.1 192L165.8 320l95.1 0 21.3-128-95.1 0z"
              />
            </svg>
          ),
          execute: (state: any, api: any) => {
            try {
              // S1: prefix 防御性检查——尊重 ICommand.prefix 的可选性
              if (!state.command?.prefix) return;

              // S3: 输入边界校验——text 必须为非空字符串，选区范围必须有效
              const { text, selection } = state;
              if (!text || typeof text !== 'string') return;
              if (selection?.start == null || selection.end == null) return;
              if (selection.start < 0 || selection.end < selection.start || selection.end > text.length) return;

              // 行首检测——cursor 在行首时无有效选区可包裹，跳过防止 selectWord 扩展至整行
              const lineStart = text.lastIndexOf('\n', selection.start - 1) + 1;
              const beforeCursor = text.slice(lineStart, selection.start).trim();
              if (beforeCursor === '') return;

              // S4: 标题语义碰撞检测——当前行为 Markdown H1~H6 标题时跳过，
              //     防止 # 前缀 toggle 意外删除标题标记导致文档结构破坏
              const lineEnd = text.indexOf('\n', selection.start);
              const currentLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
              if (/^#{1,6}\s/.test(currentLine)) return;

              originalExecute?.(state, api);
            } catch (err) {
              // S2: 错误边界——防止 selectWord/executeCommand 异常冒泡至编排层
              console.error('[MarkdownEditor] issue 命令执行失败:', err);
            }
          },
        };
      }

      // P1-1/S1/Q-6/P2-01/UI-P2-01/UI-P3-01:
      // 修复 quote 命令——macOS Cmd+Q 退出浏览器冲突 + prefix! 非空断言崩溃 +
      // execute 缺少错误边界 + 英文 ARIA 硬编码 + SVG 图标尺寸偏小
      if (command.name === 'quote') {
        const originalExecute = command.execute;
        if (originalExecute) {
          return {
            ...command,
            shortcuts: 'ctrlcmd+shift+q',
            buttonProps: {
              'aria-label': '插入引用 (Ctrl+Shift+Q)',
              title: '插入引用 (Ctrl+Shift+Q)',
            },
            execute: (state: any, api: any) => {
              try {
                if (!state.command?.prefix) return;
                if (!state.text || typeof state.text !== 'string') return;
                const { start, end } = state.selection ?? {};
                if (start == null || end == null || start < 0 || end < start || end > state.text.length) return;
                originalExecute(state, api);
              } catch (err) {
                console.error('[MarkdownEditor] quote 命令执行失败:', err);
              }
            },
          };
        }
      }

      // SEC-M1/SEC-M2/QUAL-M1/QUAL-M2/QUAL-L2/I18N-01:
      // 修复 italic/bold/strikethrough 命令——prefix! 非空断言崩溃 + 输入边界校验 + 错误处理 + 中文 ARIA
      if (command.name === 'italic' || command.name === 'bold' || command.name === 'strikethrough') {
        const originalExecute = command.execute;
        // I18N-01: 中文 ARIA 标注——渲染时即生效，无需等待 annotateToolbar 后处理
        const INLINE_LABELS: Record<string, { 'aria-label': string; title: string }> = {
          bold: { 'aria-label': '粗体 (Ctrl+B)', title: '粗体 (Ctrl+B)' },
          italic: { 'aria-label': '斜体 (Ctrl+I)', title: '斜体 (Ctrl+I)' },
          strikethrough: { 'aria-label': '删除线', title: '删除线' },
        };
        const inlineLabel = INLINE_LABELS[command.name];
        if (originalExecute) {
          return {
            ...command,
            ...(inlineLabel ? { buttonProps: inlineLabel } : {}),
            execute: (state: any, api: any) => {
              try {
                if (!state.command?.prefix) return;
                if (!state.text || typeof state.text !== 'string') return;
                const { start, end } = state.selection ?? {};
                if (start == null || end == null || start < 0 || end < start || end > state.text.length) return;
                originalExecute(state, api);
              } catch (err) {
                console.error(`[MarkdownEditor] 命令 "${command.name}" 执行失败:`, err);
              }
            },
          };
        }
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

      // P1-01/P1-02/A-02/S-01/UI-P1-01/UI-P1-02/UI-P2-02/UI-P3-02:
      // 覆盖 preview/edit/live 模式切换命令——
      // 1. 替换辨识度极低的方括号 SVG 为 antd 语义图标（EditOutlined/SplitCellsOutlined/EyeOutlined）
      // 2. 修复 execute 双路径死代码——移除 shortcuts 条件 guard，统一按钮点击和快捷键路径
      // 3. api.textArea 添加可选链空值防护
      // 4. 中文 buttonProps 覆盖英文硬编码
      if (command.keyCommand === 'preview' && (command.name === 'edit' || command.name === 'live' || command.name === 'preview')) {
        const modeMap: Record<string, { icon: React.ReactElement; label: string }> = {
          edit: { icon: <EditOutlined style={{ fontSize: 16 }} />, label: '编辑模式' },
          live: { icon: <SplitCellsOutlined style={{ fontSize: 16 }} />, label: '实时预览' },
          preview: { icon: <EyeOutlined style={{ fontSize: 16 }} />, label: '预览模式' },
        };
        const mode = command.name;
        const config = modeMap[mode];
        if (!config) return command;

        const shortcutKey = command.shortcuts?.replace('ctrlcmd+', 'Ctrl+') ?? '';
        return {
          ...command,
          buttonProps: {
            'aria-label': `${config.label}${shortcutKey ? ` (${shortcutKey})` : ''}`,
            title: `${config.label}${shortcutKey ? ` (${shortcutKey})` : ''}`,
          },
          icon: config.icon,
          execute: (_state: any, api: any, dispatch?: any) => {
            api.textArea?.focus();
            if (dispatch) {
              dispatch({ preview: mode });
            }
          },
        };
      }

      return command;
    },
    [],
  );

  // S3/S4 修复增强：预览区标签白名单 + input 类型检查 + URL 属性危险协议检查
  const previewAllowElement = useCallback(
    (element: { tagName: string; properties?: Record<string, unknown> }) => {
      const tag = element.tagName.toLowerCase();
      if (!SAFE_TAGS.has(tag)) return false;
      if (tag === 'input') {
        const type = element.properties?.type;
        return typeof type === 'string' && SAFE_INPUT_TYPES.has(type);
      }
      if (element.properties) {
        for (const [key, val] of Object.entries(element.properties)) {
          if (URL_PROPERTIES.has(key) && typeof val === 'string' && DANGEROUS_URL_RE.test(val)) {
            return false;
          }
        }
      }
      return true;
    },
    [],
  );

  // S4 修复：预览区 rehypeRewrite 属性清理（清理 on* 事件属性 + 危险 URL）
  const previewRehypeRewrite = useCallback(
    (node: any, _index: number | undefined, _parent: any) => {
      if (node.type !== 'element') return;
      const props = node.properties;
      if (props && typeof props === 'object') {
        for (const key of Object.keys(props)) {
          if (DANGEROUS_ATTR_RE.test(key)) {
            delete props[key];
          } else if (key !== 'data-code' && typeof props[key] === 'string' && URL_PROPERTIES.has(key) && DANGEROUS_URL_RE.test(props[key])) {
            delete props[key];
          }
        }
      }
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
          height={autoHeight}
          preview={preview}
          tabSize={tabSize}
          autoFocus={autoFocus}
          textareaProps={{ placeholder, readOnly, 'aria-label': 'Markdown 内容编辑区' }}
          commandsFilter={commandsFilter}
          previewOptions={{
            urlTransform: safeUrlTransform,
            allowElement: previewAllowElement,
            rehypeRewrite: previewRehypeRewrite,
          }}
        />
        {/* UX-03: 全屏模式 Escape 退出提示 */}
        {showFullscreenHint && (
          <div
            className="markdown-editor-fullscreen-hint"
            role="status"
            aria-live="polite"
          >
            按 Escape 退出全屏
          </div>
        )}
      </div>
    </MarkdownEditorErrorBoundary>
  );
});

MarkdownEditorBase.displayName = 'MarkdownEditor';

const MarkdownEditor = memo(MarkdownEditorBase);
MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
