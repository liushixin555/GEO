# upload.controller.ts — 软件开发专家评审修复记录

**修复日期**: 2026-05-24
**修复角色**: 软件开发专家
**修复依据**: upload.controller.md（质量评审）、upload.controller.security.md（安全评审）、upload.controller.architecture.md（架构评审）、upload.controller.committer.md（Committer 评审）
**修复文件**: `apis/controller/upload.controller.ts`、`tests/apis/upload.controller.test.ts`

---

## 修复清单

### P0 — 已修复

| 编号 | 问题 | 修复方案 | 来源 |
|------|------|----------|------|
| H-1 | SVG 存储型 XSS | 从 `ALLOWED_TYPES` 移除 `'image/svg+xml'` | 安全 H-1 / 质量 H-1 / Committer BLOCK-1 |

### P1 — 已修复

| 编号 | 问题 | 修复方案 | 来源 |
|------|------|----------|------|
| H-3a | `err: any` 类型 | 改为 `unknown` + `instanceof MulterError` / `instanceof Error` 分类 | 质量 H-3 / 安全 H-3 / 架构 M-3 |
| H-3b | 超限返回 500 | `LIMIT_FILE_SIZE` 返回 413 + 友好提示 | 质量 H-3 / Committer DEFECT-1 |
| H-3c | 错误消息泄露 | 500 错误统一返回"上传失败"，不暴露 `err.message` | 安全 H-3 / Committer DEFECT-2 |
| H-2 | MIME 类型伪造 | 添加 Magic Bytes 文件签名验证（JPEG/PNG/GIF/WebP） | 安全 H-2 / 质量 H-2 |
| M-1 | 扩展名未净化 | MIME→扩展名映射表，不使用 `path.extname(file.originalname)` | 安全 M-1 / 质量 L-1 |
| M-2 | 重复目录创建检查 | 移除 `destination` 回调中的 `existsSync`，模块级直接 `mkdirSync` | 质量 M-2 |

### 测试更新

| 变更 | 说明 |
|------|------|
| SVG 测试改为拒绝测试 | 原 SVG 上传成功测试改为验证 400 拒绝 |
| 超限测试改为 413 | 原断言 500 改为 413 + 友好消息断言 |
| 错误消息脱敏测试 | 原断言 `err.message` 泄露改为断言通用消息"上传失败" |
| 新增 MIME 伪造测试 | 集成测试 + 单元测试各 1 例 |
| 单元测试 Mock 适配 | 成功测试提供真实临时文件用于 Magic Bytes 验证 |

### 未修复（技术债务）

| 编号 | 问题 | 原因 | 计划 |
|------|------|------|------|
| 架构 H-1 | 与 upload-document.controller.ts 代码重复 | 需独立迭代重构 | 下一迭代 |
| 架构 H-2 | 配置硬编码 | 需 config 体系扩展 | 下一迭代 |
| 架构 H-3 | 模块级副作用 | 已简化（移除条件检查），但仍有 `mkdirSync` | 下一迭代 |
| 质量 M-4 | 无文件清理机制 | 中长期规划 | 中长期 |
| 安全 M-2 | 静态服务无安全头 | 需在 `app.ts` 中配置 | 下一迭代 |
| 安全 M-3 | 解压炸弹防护 | 需引入 `image-size` 依赖 | 下一迭代 |

---

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
```

---

*软件开发专家修复完成 — 2026-05-24*
