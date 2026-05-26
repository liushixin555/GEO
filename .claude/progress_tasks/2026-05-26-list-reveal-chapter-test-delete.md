# fix058: list-reveal-chapter.test.tsx 评审修复（删除）

**日期**: 2026-05-26
**类型**: 评审修复
**评审文件**:
- `tasks/review/list-reveal-chapter.test.tsx.architecture.md` (1.0/10 REJECT)
- `tasks/review/list-reveal-chapter.test.tsx.quality.md` (1.2/10 REJECT)
- `tasks/review/list-reveal-chapter.test.tsx.security.md` (1.0/10 REJECT)
- `tasks/review/list-reveal-chapter.test.tsx.committer.md` (1.0/10 REJECT)

---

## 修复方式：删除文件

### 阻断项（4项，全部通过删除解决）

| 阻断项 | 描述 | 修复方式 |
|--------|------|----------|
| B-1 | 被测模块 ListRevealChapter 不存在（TS2307），59测试全部不可执行 | 删除文件 |
| B-2 | 三处引用 `.agents/` 只读目录，违反 CLAUDE.md 铁律第6条 | 删除文件 |
| B-3 | MaskReveal Mock 与真实组件 API 完全断裂（data-* vs className+style） | 删除文件 |
| B-4 | CSS Module mock 为空对象，断言前提自相矛盾 | 删除文件 |

### 修复理由

四份评审（架构/质量/安全/Committer）一致裁定 REJECT，三维交叉确认：

1. **被测目标不存在** — `import` 路径指向 `.agents/skills/.../list-reveal/chapter`，该文件在项目中不存在。TypeScript 编译直接报 TS2307 错误，59 个测试用例全部为死代码，0 个可执行。

2. **铁律违规** — 三处 import/mock 引用 `.agents/skills/` 只读目录，违反 CLAUDE.md 铁律第6条。正确做法是将组件复制到项目源码层后再编写测试。

3. **Mock 架构根基错误** — MaskReveal mock 使用 `data-*` 属性透传，真实组件使用 className + inline style。两套完全不同的 DOM 结构意味着即使源组件存在，所有 MaskReveal 相关的 15+ 个断言也会失败。

4. **零安全价值** — 无任何安全测试用例，OWASP Top 10 零覆盖。

### 变更文件

| 操作 | 文件 |
|------|------|
| 删除 | `tests/pages/list-reveal-chapter.test.tsx` (444行) |

### 评估

- 修复前评分：1.0/10 (四维一致 REJECT)
- 修复方式：删除（唯一合理方案）
- 残留风险：无（被测组件不存在，删除无影响）
