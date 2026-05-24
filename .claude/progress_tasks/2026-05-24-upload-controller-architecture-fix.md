# upload.controller 架构评审修复

## 日期
2026-05-24

## 变更摘要
根据架构评审报告修复 upload.controller.ts 的结构性问题（H-1 DRY违反、H-2 配置硬编码、H-3 模块级副作用、M-2 安全头缺失）

## 修复清单

### H-1: DRY 违反 — 提取共享上传基础设施
- **新建** `apis/utils/upload-factory.ts` — 共享上传工厂（延迟目录初始化、multer 存储配置、统一错误处理中间件、FileFilterError）
- **新建** `apis/utils/image-validator.ts` — 图片验证器（遵循 DocumentValidator 模式，提取 MIME 验证、Magic Bytes 验证）
- 两个控制器共享同一套目录管理、multer 配置和错误处理逻辑

### H-2: 配置硬编码 — 接入 Config-driven 体系
- `apis/config/index.ts` 增加 `upload` 配置段（`imageMaxSize`、`documentMaxSize`）
- 环境变量 `UPLOAD_IMAGE_MAX_SIZE`（默认10MB）、`UPLOAD_DOCUMENT_MAX_SIZE`（默认30MB）
- 文件类型白名单移入 ImageValidator（业务规则，不适合环境变量）

### H-3: 模块级副作用 — 延迟初始化
- `getUploadDir()` 替代模块级 `fs.mkdirSync`，仅在首次调用时创建目录
- 两个控制器不再有 import 时的文件 I/O 副作用

### M-2: 静态文件安全头
- `apis/app.ts` 增加 `X-Content-Type-Options: nosniff` 防止 MIME 嗅探

### 行为改进
- LIMIT_FILE_SIZE 统一返回 413（HTTP 标准 Payload Too Large）
- 错误消息统一格式：`文件大小超过限制（最大 NMB）`

## 测试
- 图片上传 39 测试全通过
- 文档上传 36 测试全通过
- DocumentValidator 86 测试全通过
- TypeScript 编译通过

## 评审对应
- H-1 ✅ 提取共享 upload-factory + image-validator
- H-2 ✅ config/index.ts 增加 upload 配置段
- H-3 ✅ getUploadDir() 延迟初始化
- M-2 ✅ X-Content-Type-Options: nosniff
- M-3 ✅ 统一错误处理（工厂模式统一 MulterError 分类）
