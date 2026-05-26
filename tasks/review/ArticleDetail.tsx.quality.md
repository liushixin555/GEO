# ArticleDetail.tsx 软件质量专家评审

**文件**: `pages/article/ArticleDetail.tsx`
**评审人**: 软件质量专家
**评审日期**: 2026-05-26
**评审类型**: 质量评审（Quality Review）
**代码行数**: 236 行

---

## 总评

| 维度 | 评分 | 等级 |
|------|------|------|
| 功能正确性 | 6.5/10 | ACCEPTABLE |
| 鲁棒性 | 5.0/10 | NEEDS IMPROVEMENT |
| 可维护性 | 6.0/10 | ACCEPTABLE |
| 可测试性 | 4.5/10 | NEEDS IMPROVEMENT |
| 一致性 | 7.0/10 | GOOD |
| **综合评分** | **5.8/10** | **CONDITIONAL APPROVE** |

---

## 正面评价

1. **Hook 拆分合理** — 通过 5 个自定义 hook（`useArticleDetail` / `useArticlePermissions` / `useArticleActions` / `useDocumentImport` / `useKnowledgeBase`）将业务逻辑从组件中抽离，主组件专注于组装和协调，职责划分清晰
2. **Antd 组件使用规范** — 全部使用 antd 组件（Form、Button、Tag、Popconfirm、Collapse、Spin、Typography），无原生 HTML 元素替代，符合 CLAUDE.md 铁律
3. **权限控制清晰** — `useArticlePermissions` 基于文章状态和用户角色计算 5 种权限（canEditSettings / canEditContent / canReview / canSubmitForReview / canDelete），权限判断集中且可追溯
4. **离开保护机制** — L51-59 的 `beforeunload` 事件监听防止用户意外离开丢失未保存内容
5. **自动保存** — L62-69 的 5 分钟定时 autoSave，新建文章创建后自动 navigate 到新 URL
6. **状态配置统一** — `STATUS_CONFIG` 统一管理状态标签和颜色，集中维护
7. **严格遵循项目规范** — 无 GEO 字眼，时间格式化由 hook 层处理，符合 CLAUDE.md 所有约定
8. **双模式支持** — AI 生成模式和手动编写模式通过 `writeMode` 状态驱动，UI 条件渲染清晰

---

## 发现问题

### BLOCKING（阻断项）— 必须修复

#### B-1: autoSave useEffect 依赖数组导致 interval 频繁重建
- **严重性**: BLOCKING
- **位置**: L61-69
- **问题**: `useEffect` 的依赖数组包含 `detail.autoSave` 和 `imageList`。`detail.autoSave` 每次 `useArticleDetail` 重新渲染都会产生新的函数引用（因为内部依赖了 `contentRef`、`savingRef` 等 state），导致 `setInterval` 被频繁清除并重建。每次 imageList 更新（用户上传/删除图片）也会触发 interval 重建。
- **影响**: (a) 自动保存在高交互场景下可能被反复重置计时；(b) 若 interval 清除时正好在 autoSave 执行中，可能导致保存中断；(c) 不必要的资源浪费。
- **修复建议**: 使用 `useRef` 存储 `autoSave` 和 `imageList` 的最新值，让 useEffect 的依赖只依赖 `isNew` 和 `id`（真正决定是否需要 interval 的变量），interval 内部通过 ref 读取最新值：
  ```typescript
  const autoSaveRef = useRef(detail.autoSave);
  const imageListRef = useRef(imageList);
  useEffect(() => { autoSaveRef.current = detail.autoSave; }, [detail.autoSave]);
  useEffect(() => { imageListRef.current = imageList; }, [imageList]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const result = await autoSaveRef.current(imageListRef.current);
      if (result?.navigateTo) navigate(result.navigateTo, { replace: true });
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [isNew, id, navigate]);
  ```

#### B-2: empty catch 吞掉所有错误，消费者无感知
- **严重性**: BLOCKING
- **位置**: L118
- **问题**: `catch {}` 完全吞掉异常，注释 "Error already set in hook" 不够准确 — `useArticleDetail.saveSettings` 内部 `setError` 只设置错误消息，但 `handleSave` 的后续逻辑（navigate、setContentMode、fetchArticle）依赖 try 块内正常执行路径。异常被吞掉后这些逻辑全部跳过，用户看到表单提交按钮 loading 结束但页面无任何反馈。
- **修复建议**: 至少添加 `message.error('保存失败，请重试')` 或检查 `detail.error` 状态显示错误：
  ```typescript
  } catch {
    message.error(detail.error || '保存失败，请重试');
  }
  ```

#### B-3: beforeunload 保护不覆盖 imageList 变更
- **严重性**: BLOCKING
- **位置**: L51-59
- **问题**: 离开保护只检查 `detail.content !== originalContentRef.current` 和 `form.isFieldsTouched()`，遗漏了 `imageList` 的变更。用户上传/删除图片后直接关闭页面不会触发离开确认提示，导致图片变更丢失。
- **修复建议**: 添加 imageList 变更检测：
  ```typescript
  const imageChanged = !isEqual(imageList, detail.article?.images || []);
  if (contentChanged || formChanged || imageChanged) e.preventDefault();
  ```
  或使用 `originalImageListRef` 追踪初始值。

---

### HIGH（高优项）— 强烈建议修复

#### H-1: window.history.replaceState 绕过 React Router
- **严重性**: HIGH
- **位置**: L81
- **问题**: 直接调用 `window.history.replaceState({}, '')` 清除 `location.state`，绕过了 React Router 的状态管理。这可能导致 React Router 的内部状态与浏览器 history 不同步，在某些场景下（如浏览器前进/后退）产生不可预期行为。
- **修复建议**: 使用 `navigate(location.pathname, { replace: true, state: {} })` 替代直接操作 history API。

#### H-2: magic number 缺少语义化常量
- **严重性**: HIGH
- **位置**: L67
- **问题**: `5 * 60 * 1000` 是 autoSave 的间隔时间，但作为 magic number 嵌入 useEffect 中，缺少语义化命名。同文件中 `L79, L110` 的 `100` 也是 magic number（setTimeout 延迟）。
- **修复建议**: 提取为命名常量：
  ```typescript
  const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;
  const SCROLL_DELAY_MS = 100;
  ```

#### H-3: 两个 location.state useEffect 可合并，逻辑分散
- **严重性**: HIGH
- **位置**: L71-83
- **问题**: L71-73 和 L75-83 两个 useEffect 都处理 `location.state`，逻辑分散。第一个在 `!isNew` 时重置 contentMode，第二个在 `openContentEdit` 时设置 contentMode 并滚动。两者的执行顺序和交互不直观 — 第一个先执行将 contentMode 设为 preview，然后第二个再设为 edit，产生不必要的中间状态。
- **修复建议**: 合并为单个 useEffect：
  ```typescript
  useEffect(() => {
    if (isNew) return;
    if (location.state?.openContentEdit) {
      setContentMode('edit');
      setTimeout(() => {
        document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
      }, SCROLL_DELAY_MS);
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      setContentMode('preview');
    }
  }, [isNew, location.state, location.pathname, navigate]);
  ```

#### H-4: 底部按钮条件渲染逻辑组合爆炸
- **严重性**: HIGH
- **位置**: L213-229
- **问题**: 4 个按钮基于 `isNew`、`status === 'draft'`、`permissions.canDelete`、`writeMode` 四个维度做条件渲染，逻辑分散在 4 个独立的三元表达式中。且 `存草稿` 和 `提交给AI` / `提交` 按钮都调用 `submitForm(handleSave)`，区别仅在按钮文案，实际行为由 `writeMode` 在 `handleSave` 内部分支处理 — 这意味着"存草稿"按钮实际上也会执行 writeMode 对应的逻辑（如 AI 提交），而非真正的"存草稿"。
- **影响**: 用户点击"存草稿"时，如果 writeMode 为 'ai'，实际执行的是 `submitForGeneration: true`，与按钮文案语义不符。
- **修复建议**: (a) 提取按钮配置数组，用数据驱动渲染；(b) `存草稿` 按钮需要传不同的 options（如 `submitForGeneration: false`）来区分真正的草稿保存和 AI 提交。

#### H-5: Spin 组件 tip 属性不生效
- **严重性**: HIGH
- **位置**: L135
- **问题**: Antd `Spin` 的 `tip` 属性只有在有子元素时才会显示加载文字。当前用法 `<Spin size="large" tip="正在加载文章..." />` 无子元素，tip 文字不会渲染，用户只看到 spinning 图标。
- **修复建议**: 添加子元素或使用 `<Spin size="large"><div style={{ minHeight: 200 }} /></Spin>`，或改用 `<Skeleton />` 组件。

---

### MEDIUM（中优项）— 建议修复

#### M-1: scrollIntoView 硬编码 DOM ID，不符合 React 范式
- **位置**: L79, L110
- **问题**: 使用 `document.getElementById('article-content-section')` 直接操作 DOM 进行滚动，绕过了 React 的 ref 机制。如果子组件 `ArticleContentEditor` 或 `Collapse` 重新渲染导致 DOM 节点变化，滚动可能失效。
- **修复建议**: 使用 `useRef` + 子组件 forwardRef 传递 scroll target。

#### M-2: detail.article 作为 useEffect 依赖，引用不稳定
- **位置**: L41-45
- **问题**: `detail.article` 整个对象作为依赖项。如果 `useArticleDetail` 每次返回新的对象引用（即使内容不变），imageList 的初始化 useEffect 会不必要地执行。
- **修复建议**: 依赖改为 `detail.article?.images`，只关心 images 变化。

#### M-3: autoSave 无失败降级策略
- **位置**: L62-69
- **问题**: setInterval 中的 autoSave 如果连续失败（如网络断开），没有错误计数、退避策略或用户提示。用户可能误以为自动保存在正常工作。
- **修复建议**: 添加失败计数，连续 N 次失败后通过 message.warning 提示用户。

#### M-4: handleDelete 失败无用户反馈
- **位置**: L123-126
- **问题**: `deleteArticle` 返回 `false` 时（删除失败），组件没有任何用户反馈，用户不知道删除操作失败了。
- **修复建议**: 添加 `else { message.error('删除失败'); }`。

#### M-5: 类型断言缺少运行时保护
- **位置**: L25
- **问题**: `(Form.useWatch('write_mode', form) ?? 'ai') as WriteMode` — `as WriteMode` 是编译时断言。如果表单值被意外设为非 WriteMode 值（如 undefined 或空字符串），断言会静默通过，后续 writeMode === 'ai' / 'manual' 判断全部不匹配，导致按钮不显示或行为异常。
- **修复建议**: 添加 fallback 验证：`const writeMode = VALID_WRITE_MODES.includes(raw) ? raw : 'ai';`

---

### LOW（低优项）— 可选优化

#### L-1: navigate('/article') 不保留列表页筛选状态
- **位置**: L126, L200
- **问题**: 返回文章列表时直接 `navigate('/article')`，不携带之前的筛选/分页参数，用户返回后需要重新筛选。
- **建议**: 使用 `navigate(-1)` 或在 state 中携带筛选参数。

#### L-2: isNew 判断基于路由参数字符串比较
- **位置**: L22
- **问题**: `id === 'new'` 是纯字符串比较，如果路由模式变更（如使用 `/article/new` 而非 `/article/new` 的 param 方式），此处需要同步修改。当前可接受但扩展性较差。

#### L-3: Popconfirm 缺少 description 的国际化
- **位置**: L216
- **问题**: `description="删除后不可恢复"` 硬编码中文，与项目其他地方的文案管理模式不一致。

---

## 修复优先级汇总

| 编号 | 严重性 | 问题 | 修复工作量 |
|------|--------|------|-----------|
| B-1 | BLOCKING | autoSave interval 频繁重建 | 小（ref 模式） |
| B-2 | BLOCKING | empty catch 无错误反馈 | 小（1 行） |
| B-3 | BLOCKING | beforeunload 不覆盖 imageList | 小（3 行） |
| H-1 | HIGH | replaceState 绕过 React Router | 小 |
| H-2 | HIGH | magic number | 小 |
| H-3 | HIGH | 两个 useEffect 可合并 | 中 |
| H-4 | HIGH | 按钮逻辑组合爆炸+语义错误 | 中 |
| H-5 | HIGH | Spin tip 不生效 | 小 |
| M-1 | MEDIUM | scrollIntoView 硬编码 DOM | 中 |
| M-2 | MEDIUM | article 对象引用不稳定 | 小 |
| M-3 | MEDIUM | autoSave 无失败降级 | 小 |
| M-4 | MEDIUM | handleDelete 无失败反馈 | 小 |
| M-5 | MEDIUM | WriteMode 类型断言无保护 | 小 |

---

## 结论

**CONDITIONAL APPROVE** — ArticleDetail.tsx 作为文章模块的核心页面组件，Hook 拆分策略合理，antd 使用规范，权限控制清晰。但存在 3 项 BLOCKING 问题（autoSave interval 重建、empty catch、离开保护不完整）和 5 项 HIGH 问题（history API 绕过 React Router、magic number、useEffect 分散、按钮语义错误、Spin tip 不可见）需要修复后方可合并。其中 H-4（"存草稿"按钮实际执行 AI 提交）属于功能性缺陷，可能导致用户误操作。
