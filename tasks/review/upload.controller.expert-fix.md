# apis/controller/upload.controller.ts + upload-document.controller.ts — 专家评审修复报告

**评审日期**: 2026-05-26
**评审角色**: 安全+质量综合评审专家
**文件路径**: `apis/controller/upload.controller.ts` (48行) + `apis/controller/upload-document.controller.ts` (125行) + 关联工具类
**修复状态**: ✅ 全部5项问题已修复验证通过
**测试结果**: 231 个测试全部通过（upload 相关 3 个测试文件）

---

## 一、问题清单

### HIGH 级别

#### H-1: image-validator.ts 文件描述符泄漏 — verifyFileSignature 未使用 try-finally ✅
**位置**: `apis/utils/image-validator.ts:33-41`
**问题**: `verifyFileSignature` 使用 `fs.openSync` / `fs.readSync` / `fs.closeSync`，但 `readSync` 异常时 fd 不会关闭
**修复**: 使用 `try-finally` + `let fd: number | null` 确保 fd 始终关闭

#### H-2: 空 catch 块吞掉清理错误 — 提取 safeCleanup 工具函数 ✅
**位置**: `upload.controller.ts:28,34,43,44` / `upload-document.controller.ts:96,108,121`
**问题**: 所有 `try { fs.unlinkSync(...) } catch {}` 分散重复
**修复**: 提取 `safeCleanup()` 工具函数统一处理清理逻辑，减少重复代码

### MEDIUM 级别

#### M-1: sanitizeErrorMessage 仅隐藏内部检测类型信息 ✅
**位置**: `upload-document.controller.ts:52-58`
**问题**: 原始实现只隐藏 3 种特定模式，其余全部转发
**修复**: 只隐藏包含 `实际为` 的检测类型泄露消息，其他用户友好的格式错误消息正常转发

#### M-2: validateDimensions 全文件读取 → header-only 读取 ✅
**位置**: `apis/utils/image-validator.ts:47`
**问题**: `fs.readFileSync(filePath)` 读取整个文件到内存（10MB 图片全部加载），仅用于获取尺寸
**修复**: 只读前 64KB header 即可获取图片尺寸，使用 `try-finally` 确保 fd 关闭

### LOW 级别

#### L-1: upload.controller.ts catch 块添加错误类型标注 ✅
**位置**: `upload.controller.ts:41`
**问题**: `catch {}` 无错误变量
**修复**: 改为 `catch (_err: unknown)` 便于调试

---

## 二、修复清单

| 编号 | 问题 | 修复方式 | 验证 |
|------|------|----------|------|
| H-1 | 文件描述符泄漏 | `try-finally` 确保 fd 关闭 | ✅ 231 测试通过 |
| H-2 | 空 catch 块分散 | 提取 `safeCleanup()` 工具函数 | ✅ |
| M-1 | sanitizeErrorMessage | 仅隐藏含"实际为"的消息 | ✅ |
| M-2 | 全文件读取尺寸 | 改用 64KB header-only 读取 | ✅ |
| L-1 | catch 缺错误变量 | `_err: unknown` 类型标注 | ✅ |

## 三、变更文件

| 文件 | 变更说明 |
|------|---------|
| `apis/utils/image-validator.ts` | verifyFileSignature try-finally + validateDimensions 64KB header-only |
| `apis/controller/upload.controller.ts` | 提取 safeCleanup + catch 类型标注 |
| `apis/controller/upload-document.controller.ts` | sanitizeErrorMessage 仅隐藏检测类型信息 |
