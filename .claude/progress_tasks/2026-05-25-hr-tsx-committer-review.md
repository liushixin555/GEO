# hr.tsx Committer 审核专家评审记录

**日期**: 2026-05-25
**文件**: `tasks/review/hr.tsx.committer.md`
**评审对象**: `@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`

## 评审结论

⚠️ 有条件通过（CONDITIONAL APPROVE）— 5.0/10

## 前序评审

- 架构评审 5.0/10 CONDITIONAL APPROVE
- 安全评审 6.5/10 APPROVE
- UI 评审 3.2/10 REJECT

## 关键发现

### 必须修复（P1）— 阻塞生产环境

1. **P1-1**: Ctrl+H 快捷键与浏览器历史记录冲突，用户按快捷键触发页面跳转导致编辑内容丢失
   - 修复方案：封装层覆盖 `hr.shortcuts` 为 `ctrlcmd+shift+h` 或移除快捷键
2. **P1-2**: SVG 图标渲染字母 "HR" 而非水平线，用户无法直觉识别功能
   - 修复方案：CSS 替换图标为水平线条

### 不阻塞合并（15 项）

- 非空断言 `prefix!` ×4（运行时安全，类型系统间隙）
- selectWord 不适用行级块元素 toggle（封装层可覆盖 execute）
- 用户选区静默丢弃（HR 语义决定非包裹行为）
- SVG 路径膨胀 ~1200 字符（单实例影响可忽略）
- 英文 ARIA / tooltip（封装层可动态替换）
- 无错误边界（库内部模块豁免）

## 同级命令对比

hr.tsx 5.0/10 是同级命令中评分最低（bold 8.0、code 7.2），核心根因是 HR 行级块元素被套入行内标记命令模式。

## 后续行动

1. 封装层完成 P1-1/P1-2 后方可上线
2. P2 修复建议下一迭代（中文 ARIA + Carbon focus ring + execute 行级检测）
3. P3 纳入技术债（触摸目标 + 移动端 + i18n）
