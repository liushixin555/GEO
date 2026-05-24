## 本次变更（2026-05-24 ArticleDetail.tsx 软件质量专家评审）
- [x] **软件质量专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合评级 C+（功能完整，但组件体量严重超标，职责耦合度高）
  - 14 项质量发现：CRITICAL×2（889行单组件违反SRP、mammoth HTML转换XSS风险）、HIGH×3（localStorage解析无容错、Token重复获取11处、useEffect依赖项缺失）、MEDIUM×5（知识库API无缓存、JSX嵌套过深、错误处理不一致、表单校验分散、类型安全不足）、LOW×4（CSS变量引用不规范、缺少loading提示、Collapse forceRender、未使用date工具）
  - 安全问题汇总：CRITICAL×1（XSS）、HIGH×1（localStorage）、MEDIUM×2（Token存储/CSRF）、LOW×1（URL校验）
  - 正面评价：业务流程完整9/10、权限控制到位、自动保存机制合理、文档导入功能良好
  - 建议拆分方案：主组件+6个子组件+3个自定义hooks
  - 评审报告 tasks/review/ArticleDetail.tsx.md


## 本次变更（2026-05-24 ArticleDetail.tsx 软件架构专家评审）
- [x] **软件架构专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合评级 D+（功能完整但架构严重不合理，God Component 反模式）
  - 13 项架构发现：CRITICAL×3（889行God Component、无API层抽象、17个useState无聚合策略）、HIGH×4（useEffect生命周期管理缺陷、权限架构内嵌、自动保存竞态风险、类型架构薄弱）、MEDIUM×4（Collapse forceRender、location.state滥用、错误处理无层次化设计、组件通信架构缺失）、LOW×2（魔法字符串散布、新建/编辑模式混合）
  - 量化分析：文件行数超标4.4×、useState超标3.4×、异步函数超标6×、JSX嵌套超标1.7×
  - 提出目标架构：主文件~100行 + 5个子组件 + 6个自定义hooks + API层封装
  - 重构路线图：Phase 1安全修复(1天) → Phase 2组件拆分(2-3天) → Phase 3 Hook提取(1-2天) → Phase 4类型架构(1天) → Phase 5性能优化(1天)
  - 评审报告 tasks/review/ArticleDetail.tsx.architecture.md


## 本次变更（2026-05-24 ArticleDetail.tsx Committer审核专家评审）
- [x] **Committer审核专家评审 pages/article/ArticleDetail.tsx（889 行）**
  - 综合判定：❌ 拒绝合并（REJECT）— 5项致命问题 + 4项高危问题
  - 致命问题 BLK-01~05：零测试覆盖、缺少删除功能（规格要求）、待审核状态正文不可编辑（EDITABLE_STATUSES 缺 pending_review）、generate_failed/publish_failed 状态无法重新提交（handleRegenerate 死代码）、Alert title prop 错误（应为 message）
  - 高危问题 HIG-01~04：JSON.parse 无防护（白屏风险）、存储型 XSS（Markdown 无消毒）、自动保存定时器竞态、13+ 处重复 localStorage 读取
  - 中等问题 MED-01~05：Collapse 替代 Tabs（规格偏差）、无版本历史浏览、any 类型滥用、操作按钮条件过严、未保存提示缺失
  - 规格符合度：14/20 通过（70%），3 项功能缺失/Bug
  - 交叉审核四份已有评审（质量C+/安全D+/UI 4.2/架构D+），诊断均认同
  - 评审报告 tasks/review/ArticleDetail.tsx.committer.md


## 本次变更（2026-05-24 ArticleDetail.tsx 架构重构）
- [x] **fix017: ArticleDetail.tsx 架构重构** — 基于 tasks/review/ArticleDetail.tsx.architecture.md（D+ 评审）
  - Phase 1: 创建 `pages/lib/apiClient.ts`（统一 axios 实例，token 注入 + 401 拦截）
  - Phase 1: 创建 `pages/article/types.ts`（共享类型定义，消除 any）
  - Phase 2: 提取 6 个自定义 hooks：
    - `useArticleDetail` — 文章数据 CRUD + 自动保存（含 savingRef 竞态防护）
    - `useArticlePermissions` — 权限计算（canEditSettings/Content/Review/Delete）
    - `usePlatformSelector` — 平台选择器状态（9 个 state 聚合）
    - `useKnowledgeBase` — 知识库 + 技能 + LLM 模型选项加载
    - `useArticleActions` — 审核/重新生成/提交审核
    - `useDocumentImport` — 文档导入（md/docx + DOMPurify）
  - Phase 2: 提取 5 个子组件（React.memo 包装）：
    - `ArticleSettingsForm` — 设置表单（含平台选择 Modal）
    - `ArticleContentEditor` — 正文编辑/预览
    - `ArticleImageManager` — 图片管理（上传/URL/知识库三模式）
    - `PlatformSelectModal` — 发布平台选择弹窗
    - `ArticleReviewActions` — 审核操作栏
  - Phase 3: 主文件从 943 行精简至 ~180 行容器组件
  - 前端构建通过、类型检查通过


## 本次变更（2026-05-24 ArticleDetail.tsx Committer评审修复）
- [x] **fix018: ArticleDetail.tsx Committer评审 Blocker 修复** — 基于 tasks/review/ArticleDetail.tsx.committer.md
  - 代码已在之前架构重构（fix017）中修复了大部分 Blocker：
    - BLK-02（删除功能）: ✅ handleDelete + Popconfirm 删除按钮
    - BLK-03（pending_review 正文编辑）: ✅ EDITABLE_STATUSES 包含 pending_review
    - BLK-04（handleRegenerate 死代码）: ✅ ArticleContentEditor 中使用 regenerate 按钮
    - BLK-05（Alert title→message）: ✅ ArticleSettingsForm + ArticleReviewActions 均使用 message prop
    - HIG-01（JSON.parse 无防护）: ✅ useArticlePermissions 中 try-catch
    - HIG-02（XSS 无消毒）: ✅ MarkdownViewer 使用 DOMPurify
    - HIG-03（自动保存竞态）: ✅ 使用 ref 追踪实时值
    - HIG-04（重复 localStorage）: ✅ apiClient 拦截器统一处理
  - 新增 56 个测试用例覆盖文章核心场景（BLK-01 零测试覆盖）：
    - useArticlePermissions: 28 个（权限矩阵 + 边界情况）
    - useArticleActions: 8 个（审核/重新生成/提交审核 API 调用）
    - useDocumentImport: 5 个（md/docx 导入 + 格式校验 + 大小限制）
    - useArticleDetail: 6 个（新建 AI/手动模式 + 保存 + 删除 + autoSave）
    - ArticleDetail 组件: 9 个（渲染/加载/标题/删除按钮/按钮条件/不存在提示）
  - 前端构建通过，56 个测试全部通过

