# 2026-05-24 hook-chapter TDD 测试

## 变更内容
- 新增 `tests/pages/hook-chapter.test.tsx`：hook-chapter 组件完整测试套件
- 新增 `tasks/tdd/hook-chapter.test.md`：TDD 执行报告

## 测试结果
- 42 项测试全部通过
- 语句/分支/函数/行覆盖率均 100%

## 测试范围
| step | 场景 | 用例数 |
|------|------|--------|
| 0 | 三张 ghost 卡片 + kicker | 7 |
| 1-3 | 单图独占（含 FAKE? 角章） | 19 |
| 4 | takeover（缩略图+hero） | 6 |
| ≥5 | 钩子收束（brush 划掉） | 6 |
| 边界 | 负数/切换/极端值 | 4 |

## Mock 策略
- MaskReveal mock 为 `<span data-testid="mask-reveal">`，透传 children
- CSS 文件 mock 为空对象
