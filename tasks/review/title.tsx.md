# title.tsx 全面评审（架构+安全+UI+Committer 综合评审）

**评审日期**: 2026-05-26
**评审对象**: `@uiw/react-md-editor/src/commands/title.tsx`（40行）及其关联文件 title1-6.tsx
**当前状态**: 条件通过（综合评分 5.4/10）

## 问题清单

### P1-01 [HIGH] 循环依赖 — title.tsx ↔ title1.tsx
- **描述**: `title.tsx` 导入 `heading1`（from `./title1`），而 `title1.tsx` 导入 `headingExecute`（from `./title`），形成循环依赖
- **影响**: 模块加载顺序不确定，可能导致运行时 `heading1` 为 `undefined`
- **修复**: 移除 `title.tsx` 对 `heading1` 的导入，`heading` 命令改为显式定义所有属性

### P1-02 [HIGH] 非空断言 prefix! — title1/title2/title4
- **描述**: `state.command.prefix!` 使用非空断言，运行时 prefix 可能为 undefined
- **影响**: 类型安全风险，undefined 传入 headingExecute 导致错误
- **修复**: 改为 `state.command.prefix ?? '# '` / `?? '## '` / `?? '#### '`，与 title3/5/6 对齐

### P2-01 [MEDIUM] 废弃注释自相矛盾 — title1-6
- **描述**: 注释说 "Use `heading1` instead" 但下一行又说 "Use `title1` for inserting Heading 1"——指向已被废弃的别名
- **影响**: API 消费者混淆
- **修复**: 统一为 `@deprecated Since v4.0.0. Use headingN instead. Scheduled for removal in v5.0.0. @see headingN`

### P2-02 [MEDIUM] import 未使用 type — title.tsx/title1-4
- **描述**: title5/6 已改为 `import type`，但 title.tsx/title1-4 仍使用 `import`
- **影响**: 不必要的运行时导入，不符合最佳实践
- **修复**: 改为 `import type { ICommand, ExecuteState, TextAreaTextApi }`

### P2-03 [MEDIUM] 无障碍/样式不一致 — title1-4
- **描述**: title5/6 已有 `role="img" aria-hidden="true"` + IBM Plex Sans + Carbon ink 颜色 + 简写文本（H5/H6），但 title1-4 仍使用原生 div + "Heading N" 全文本
- **影响**: 无障碍缺失、视觉风格不一致
- **修复**: 添加 `role="img" aria-hidden="true"`，添加 `fontFamily` 和 `color`，文本改为简写（H1/H2/H3/H4）

### P2-04 [LOW] heading 命令通过 spread 继承 heading1
- **描述**: `heading = { ...heading1, icon: ... }` 隐式继承所有属性，不利于维护
- **影响**: heading1 属性变更会意外影响 heading
- **修复**: heading 显式定义所有属性

### P3-01 [LOW] headingExecute 的 suffix 默认值
- **描述**: `suffix = prefix` 在 heading 场景不合理（heading 的 suffix 应为空）
- **影响**: 调用者未传 suffix 时会错误地使用 prefix 作为 suffix
- **修复**: 改为 `suffix = ''`

### P3-02 [LOW] 废弃注释缺少版本信息
- **描述**: title.tsx 的废弃注释缺少具体的版本号（Since v4.0.0, Will be removed in v5.0.0）
- **修复**: 补充版本信息

## 修复优先级
1. P1-01: 消除循环依赖
2. P1-02: 非空断言修复
3. P2-01: 废弃注释规范化
4. P2-02: import type
5. P2-03: 无障碍/样式对齐
6. P2-04: heading 显式定义
7. P3-01: suffix 默认值
8. P3-02: 废弃注释版本信息
