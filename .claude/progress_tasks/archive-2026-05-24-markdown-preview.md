## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件质量专家评审）
- [x] **软件质量专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 5.3/10（类型定义功能正确但工程质量不足）
  - P1×3：warpperElement 拼写错误永久化到公共 API、MarkdownPreviewRef 暴露全部 Props 违反 React 最佳实践、wrapperElement 类型重复（20% DRY 违反率）
  - P2×4：文件扩展名 .tsx 无 JSX 内容应改为 .ts、隐式 React 全局命名空间引用、source 属性缺乏语义约束、pluginsFilter 参数名与类型不匹配
  - P3×3：属性缺乏 JSDoc 文档、data-color-mode 不支持 auto 模式、onMouseOver 冒泡事件选择未说明
  - 正面评价：类型继承正确（Omit<Options, 'children'>）、事件类型携带泛型参数、弃用标记完备
  - 评审报告 tasks/review/Props.tsx.quality.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件架构专家评审）
- [x] **软件架构专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 5.0/10（核心类型设计合理，Ref 接口架构和依赖耦合存在明显缺陷）
  - P1×3：Ref 接口继承全部 Props 违反 ISP/OCP 原则、WrapperElement 类型泄漏 React 实现细节（DetailedHTMLProps）、类型重复 20% DRY 违反率
  - P2×4：隐式 React 全局依赖违反 DIP、source 属性命名与 react-markdown 语义断裂、pluginsFilter 扩展点粒度不足、Props 与 Ref 混合在同一文件职责边界不清
  - P3×3：warpperElement 弃用策略缺乏运行时过渡架构、data-color-mode 缺少 auto 模式、disableCopy 否定式命名
  - SOLID 评估：SRP⚠️、OCP❌、LSP✅、ISP❌、DIP⚠️
  - 评审报告 tasks/review/Props.tsx.architecture.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 代码安全专家评审）
- [x] **代码安全专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合安全评级 ⚠️ MEDIUM（类型定义层面存在多处安全隐忧，需配合实现层验证）
  - 8 项安全发现：HIGH×2（source无长度/内容约束DoS/XSS风险、rehypeRewrite无约束HTML AST重写可绕过安全过滤）、MEDIUM×2（pluginsFilter可移除安全插件、继承react-markdown Options未过滤危险属性如allowElement）、LOW-MEDIUM×2（wrapperElement接受任意HTML属性潜在事件注入、MarkdownPreviewRef暴露全部Props+DOM引用）、LOW×1（warpperElement弃用仍可传入危险属性）、INFO×1（事件回调无消毒）
  - 供应链评估：react-markdown < v9 默认允许HTML渲染风险、rehype-rewrite AST重写能力本身是风险
  - 提供本项目调用安全检查清单（8项）和上游调用防护建议
  - 评审报告 tasks/review/Props.tsx.security.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx 软件UI专家评审）
- [x] **软件UI专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合评分 4.1/10（组件API基本可用，设计系统对齐/可访问性/开发者体验存在多项缺陷）
  - 12 项 UI 发现：P1×3（data-color-mode 缺失 auto 模式、无可访问性 a11y Props、warpperElement 拼写错误弃用属性仍在 API）、P2×4（wrapperElement 类型过于复杂、disableCopy 否定式命名、source 属性语义模糊、缺少加载/错误/空状态 Props）、P3×4（pluginsFilter 缺少功能级开关、缺少子区域样式控制、Ref 暴露全部 Props、事件处理不完整）
  - DESIGN.md 合规性映射分析：需 50+ 条 CSS 覆盖规则才能对齐 Carbon Design System
  - antd 集成兼容性分析：ConfigProvider 主题/Design Token/i18n/Form 集成均不兼容
  - 提供本项目的集成建议（封装组件 + CSS 覆盖清单）
  - 评审报告 tasks/review/Props.tsx.ui.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview Props.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 @uiw/react-markdown-preview/src/Props.tsx（30 行）**
  - 综合判定：⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，但必须创建封装组件隔离风险
  - 四份已有评审综合裁定：架构5.0/10🟡不阻塞、质量5.3/10🟡不阻塞、安全⚠️MEDIUM🔴需调用层防护、UI 4.1/10🟡需封装+CSS覆盖
  - 6项阻塞项（封装层完成前不可生产使用）：创建MarkdownViewer封装组件、source长度截断≤1MB、禁止暴露rehypeRewrite/pluginsFilter、确认react-markdown≥9.0、CSS覆盖对齐Carbon Design System、a11y属性
  - 4项建议改进：封装组件加载/错误/空状态、主题自动同步、单元测试、版本锁定
  - 安全重点：SEC-MD-01 source无约束(HIGH)和SEC-MD-02 rehypeRewrite无约束(HIGH)必须在调用层防护
  - 评审报告 tasks/review/Props.tsx.committer.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview common.tsx 代码安全专家评审）
- [x] **代码安全专家评审 @uiw/react-markdown-preview/src/common.tsx（27 行）**
  - 综合安全评级 B+（中高风险，库本身无消毒层，使用方需额外防护）
  - STRIDE 威胁建模：Tampering 高、Spoofing/InfoDisclosure/EoP 中
  - 6 项安全风险：🔴严重（rehypeRaw XSS 直达 DOM）、🟠高×2（外部插件注入、自定义 rewrite 回调）、🟡中×2（rehypeAttrs 属性解析、无 CSP 集成）、🟡中（插件管线顺序问题）
  - 本项目实际风险评估：MarkdownViewer.tsx 仅 1MB 长度截断，无客户端消毒，依赖"服务端消毒"单一防线
  - P0 修复建议：引入 rehype-sanitize 或 DOMPurify 消毒层
  - 评审报告 tasks/review/common.tsx.security.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview common.tsx 软件UI专家评审）
- [x] **软件UI专家评审 @uiw/react-markdown-preview/src/common.tsx（27 行）**
  - 综合评分 5.3/10（组件 API 对消费者友好，但原生 GitHub 视觉风格与 Carbon Design System 存在根本性冲突）
  - DESIGN.md 合规性分析：颜色体系冲突（GitHub Blue vs IBM Blue）、排版体系冲突（系统字体栈 vs IBM Plex Sans）、圆角体系冲突（6px vs 0px）、间距体系不一致
  - 交互体验评价：copy 功能移动端不可用（hover 触发）、标题锚点不可键盘聚焦、代码高亮色彩非 Carbon 色板
  - 无障碍评审：copy 按钮缺少 aria-label、焦点管理缺失、行内代码使用语义红色违反色彩语义原则
  - CSS 层面问题：30+ 条 !important 覆盖策略、两套重复 Markdown 覆盖样式（markdown-viewer.css + global.css）、行内代码颜色语义误用
  - 响应式问题：代码块无滚动提示、表格无响应式容器、触摸目标不满足 48px 要求
  - antd 集成兼容性：第三方库 DOM 不受控（铁律豁免）、antd Token 无法自动同步到 Markdown 区域
  - 11 项问题清单：P1×2（行内代码语义红色、重复CSS）、P2×5（移动端copy、焦点管理、表格响应式、性能隔离、重复CSS合并）、P3×4
  - 评审报告 tasks/review/common.tsx.ui.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview common.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 @uiw/react-markdown-preview/src/common.tsx（27 行）**
  - 综合判定：⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，但必须通过 MarkdownViewer 封装层隔离安全和性能风险
  - 综合评分 5.0/10：功能适用性 7、安全合规性 4、性能就绪度 4、API 契约质量 7、项目规范兼容性 3、供应链稳定性 5、封装层有效性 6
  - 四份已有评审综合裁定：质量 B🟡不阻塞、架构 5.4/10🟡不阻塞、安全 B+/HIGH🔴需封装层防护、UI 5.3/10🟡需CSS覆盖
  - 3 项前置条件：COND-1 客户端 DOMPurify 消毒（❌待实施）、COND-2 服务端消毒确认（⚠️需确认）、COND-3 CSS 回归测试（✅持续维护）
  - 安全核心问题：rehypeRaw 无条件开启 HTML 注入，MarkdownViewer 仅依赖服务端消毒单一防线
  - 性能核心问题：每次渲染重建 9 插件管线，长文档场景有性能风险，建议 React.memo 缓解
  - 10 项问题清单：P0×1（DOMPurify）、P1×2（React.memo、闭包重建）、P2×3（rehype-sanitize、属性注入、双重rehypeRaw）、P3×4（CSS冲突、供应链、DevTools、OCP）
  - 评审报告 tasks/review/common.tsx.committer.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview common.tsx 评审修复）
- [x] **MarkdownViewer 安全加固**（P0）
  - 添加 DOMPurify 客户端消毒，FORBID_TAGS 移除 script/iframe/object/embed/form/input/textarea/select/button
  - FORBID_ATTR 移除 onerror/onload/onclick/onmouseover/onfocus/onblur 等事件属性
- [x] **MarkdownViewer 性能优化**（P1）
  - 包裹 React.memo，防止父组件状态变更触发无效重渲染
  - useMemo 缓存 safeSource，依赖 [content]
  - 添加 displayName = 'MarkdownViewer'
- [x] **行内代码颜色修复**（P1）
  - 从 `var(--color-error)`（语义红色）改为 `var(--color-blue-80)`，消除色彩语义误用
  - markdown-viewer.css 和 global.css 同步修复
- [x] **CSS 重复规则合并**（P2）
  - global.css 中 `.article-content-preview .wmde-markdown` 重复规则迁移至 markdown-viewer.css
  - markdown-viewer.css 选择器同时覆盖 `.markdown-viewer` 和 `.article-content-preview`
  - global.css 仅保留注释占位
- [x] **表格响应式支持**（P2）
  - Markdown 表格添加 `display: block; overflow-x: auto`，防止移动端表格溢出
- [x] **评审报告** — 5份评审：质量(B/3.55)、架构(5.4/10)、安全(B+/中高风险)、UI(5.3/10)、Committer(5.0/10)
  - tasks/review/common.tsx.quality.md
  - tasks/review/common.tsx.architecture.md
  - tasks/review/common.tsx.security.md
  - tasks/review/common.tsx.ui.md
  - tasks/review/common.tsx.committer.md（含修复记录）


## 本次变更（2026-05-24 @uiw/react-markdown-preview index.tsx 软件质量专家评审）
- [x] **软件质量专家评审 @uiw/react-markdown-preview/src/index.tsx（27 行）**
  - 综合评分 7.5/10（库入口文件，架构清晰但性能和逻辑存在缺陷）
  - 12 项质量发现：🔴严重×3（rehypePlugins每次渲染重建、rehypeRewriteHandle每次创建新闭包、rehypeRaw双重注册）、🟠安全×1（rehypeRaw无条件启用+无消毒=XSS风险）、🟡中等×3（缺少React.memo、用户插件位置固定、index.tsx与common.tsx重复）、🟢轻微×5（PluggableList类型弱化、缺少displayName、options参数未使用、export *暴露内部类型、魔法字符串）
  - 插件链顺序分析：10个插件执行顺序基本合理，rehypeRaw无条件注册和用户插件位置固定是设计缺陷
  - 对本项目影响：安全风险已被 MarkdownViewer.tsx 的 DOMPurify 消毒缓解（commit d511ad5），性能风险建议在 MarkdownViewer 外层添加 React.memo
  - 评分明细：功能正确性17/20、性能8/15、安全性9/15、类型安全8/10、可读性13/15、可维护性11/15、最佳实践7/10
  - 评审报告 tasks/review/react-markdown-preview.index.tsx.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview index.tsx 软件架构专家评审）
- [x] **软件架构专家评审 @uiw/react-markdown-preview/src/index.tsx（27 行）**
  - 综合评分 5.4/10（管线编排简洁清晰，但性能架构、安全分层、OCP合规性存在结构性缺陷）
  - 10 项架构发现：P1×4（每次渲染重建管线+安全策略分裂+OCP违反+代码克隆index/common）、P2×3（rehypeRewriteHandle混合依赖+export*隐式导出+匿名forwardRef）、P3×3（管线顺序无约束+全量prism导入+150KB+bundle+防御式编程不一致）
  - SOLID 评估：SRP⚠️、OCP❌、LSP✅、ISP✅、DIP❌
  - 完整管线数据流分析（10个插件顺序依赖关系+安全风险标注）
  - 本项目影响：安全🔴高（rehypeRaw无条件执行，已通过DOMPurify缓解）、Bundle🟡中（建议改用common入口-150KB）、性能🟡中
  - 评审报告 tasks/review/react-markdown-preview.index.tsx.architecture.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview index.tsx 代码安全专家评审）
- [x] **代码安全专家评审 @uiw/react-markdown-preview/src/index.tsx（27 行）**
  - 综合安全评级 B-/7.8（插件管线安全边界不足，依赖调用层防护）
  - 8 项安全发现：HIGH×2（URL安全过滤被默认禁用preview.tsx:14/57、rehypeRaw无条件启用index.tsx:18）、MEDIUM×3（rehype-attr任意属性注入index.tsx:22、allowElement过滤器过于宽松preview.tsx:39-44、useImperativeHandle泄露全部props preview.tsx:34）、LOW×3（pluginsFilter可移除安全插件、rehypePrism ignoreMissing隐藏错误、useCopied事件处理器闭包未更新）
  - 本项目缓解措施：MarkdownViewer.tsx 使用 DOMPurify 预消毒（FORBID_TAGS + FORBID_ATTR + 1MB 长度限制），有效缓解 #1 和 #2
  - 修复优先级：P0×2（URL过滤+rehypeRaw可选化）、P1×2（allowElement强化+rehype-attr属性过滤）、P2×1（useImperativeHandle精简）、P3×3
  - 评审报告 tasks/review/react-markdown-preview.index.tsx.security.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview index.tsx 软件UI专家评审）
- [x] **软件UI专家评审 @uiw/react-markdown-preview/src/index.tsx（27 行）**
  - 综合评分 2.9/10（渲染管线硬编码，与 Carbon Design System 根本对立）
  - 8 个维度评分：渲染管线设计3、设计系统对齐2、可访问性1、性能3、开发者体验4、安全性3、封装质量4
  - 13 项 UI 发现：P1×3（rehypePrism 强制 GitHub 主题与 Carbon 冲突、rehypeRaw 始终启用破坏设计系统完整性、rehypeAttrs 允许任意属性注入绕过 Design Token）、P2×6（插件数组每次渲染重建、用户插件位置固定不可定制、与 preview.tsx rehypeRaw 重复处理、forwardRef 无 displayName、rehypePrism ignoreMissing 静默吞错、export * API膨胀）、P3×4（rehypeRewriteHandle 闭包重建、?? vs 解构默认值、meta 插件对分散、无错误边界）
  - DESIGN.md 合规性映射：颜色/圆角/字体/背景/HTML注入全部 ❌，需 50+ 条 CSS 覆盖
  - 渲染管线架构图（10 插件顺序 + 用户可控性标注）
  - 对本项目的集成建议：使用 nohighlight 入口 + Carbon 色板 CSS 覆盖 + MarkdownViewer 封装组件
  - 评审报告 tasks/review/react-markdown-preview.index.tsx.ui.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview index.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 @uiw/react-markdown-preview/src/index.tsx（27 行）**
  - 综合评分 4.5/10，有条件通过（CONDITIONAL APPROVE）
  - 核心发现：index.tsx 与 common.tsx 唯一差异是 rehype-prism-plus 全量 vs 核心导入，项目当前使用 index.tsx 导致额外 150KB+ gzip bundle
  - 11 项发现：P0×2（全量 bundle 浪费、rehypeRaw XSS 已缓解）、P1×2（管线重建性能、闭包重复）、P2×4、P3×3
  - 前置条件：必须将 MarkdownViewer 导入路径切换为 `@uiw/react-markdown-preview/common`
  - 安全评审已综合 5 份评审报告（质量 7.5、架构 5.4、安全 B-/7.8、UI 2.9、Committer 4.5）
  - 评审报告 tasks/review/react-markdown-preview.index.tsx.committer.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview nohighlight.tsx 软件质量专家评审）
- [x] **软件质量专家评审 @uiw/react-markdown-preview/src/nohighlight.tsx（23 行）**
  - 综合评分 6.3/10（有条件通过，性能缺陷是最大问题）
  - 与 index.tsx 差异对比：无 rehype-prism-plus（语法高亮）、无 rehype-raw（原始 HTML），bundle 更小
  - 8 项质量发现：P1×1（rehypePlugins 每次渲染重建无 useMemo）、P2×4（与 index.tsx 高度重复违反 DRY、缺少 displayName、|| vs ?? 不一致、spread 透传已消费 props）、P3×3（缺文档注释、无错误边界、rehypeRewriteHandle 隐式类型依赖）
  - 安全优势：不引入 rehype-raw 天然降低 XSS 风险
  - 与本项目关联：MarkdownViewer 已切换使用 nohighlight 入口（commit 8225cb0），P1-01 性能问题直接影响长文档渲染
  - 评审报告 tasks/review/nohighlight.tsx.md


## 本次变更（2026-05-24 @uiw/react-markdown-preview nohighlight.tsx 软件架构专家评审）
- [x] **软件架构专家评审 @uiw/react-markdown-preview/src/nohighlight.tsx（23 行）**
  - 综合评分 5.3/10（变体通过复制实现，违反开闭原则；功能正确但架构结构性缺陷）
  - 架构定位分析：三个入口变体（index/common/nohighlight）共享渲染引擎 preview.tsx，nohighlight 排除 rehypeRaw + rehypePrism，最轻量
  - 7 项架构发现：A1🔴高（三变体复制实现违反OCP，80%代码重复）、A2🟡中（入口层与配置层职责未分离）、A3🟡中（props透传导致数据流模糊/幽灵prop）、A4🟡中（缺少useMemo触发AST重解析）、A5🟡中（插件顺序依赖未文档化无保护）、A6🟢低（缺displayName）、A7🟢低（rehypeAttrs配置硬编码分散）
  - 提出策略工厂模式替代复制方案：createMarkdownEntry(config) 工厂函数 + buildRehypePipeline 纯函数
  - 本项目影响评估：MarkdownViewer 使用 common 入口（非 nohighlight），React.memo + DOMPurify 防御已到位，性能风险已缓解
  - 评审报告 tasks/review/nohighlight.tsx.architecture.md
