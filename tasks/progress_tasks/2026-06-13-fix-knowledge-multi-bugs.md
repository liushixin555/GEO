# 2026-06-13 知识库多Bug修复

## 修复内容

### 1. 文档上传400错误
- **问题**: 上传文档接口报错 `文档地址必须是有效的HTTP/HTTPS URL`
- **原因**: `knowledge.schema.ts` 中 `fileUrl` 验证正则只允许 `http/https` 开头，不接受 `/uploads/...` 相对路径
- **修复**: 正则改为 `^(https?:\/\/|\/)[^\s]+`，与 `imageUrl` 验证逻辑一致
- **文件**: `apis/schema/knowledge.schema.ts`

### 2. 关键词挖掘来源筛选改为挖掘参数
- **问题**: 挖掘来源按钮点击无筛选效果
- **原因**: 用户实际需求是挖掘来源仅作为"开始挖掘"时的参数，不需要筛选列表
- **修复**: 去掉前端筛选逻辑，Radio.Group 仅控制 `sourceType` 参数传给后端
- **文件**: `pages/knowledge/KeywordMine.tsx`
- **后端**: `MinedKeyword` 模型新增 `source_type` 字段，挖掘时记录来源

### 3. 知识库资源删除后仍显示
- **问题**: 文档/画像/图片/关键词删除后列表仍显示
- **原因**: 后端使用软删除（`update deletedAt`），但前端删除后刷新列表，旧记录可能残留
- **修复**: 四种资源的删除操作从软删除改为硬删除（`prisma.delete`）
- **文件**: `apis/service/impl/knowledge.service.impl.ts`

### 4. 文档删除不存在时报404
- **问题**: 已删除的文档再次删除报 `文档不存在` 404
- **修复**: 删除操作静默处理，不存在时 `.catch(() => {})` 不报错
- **文件**: `apis/controller/knowledge.controller.ts`, `apis/service/impl/knowledge.service.impl.ts`

### 5. Dockerfile apt/npm 加速
- **修复**: apt 添加清华镜像源，npm 全局安装指定淘宝 registry
- **文件**: `Dockerfile`

### 6. MinedKeyword 新增 source_type 字段
- **数据库**: `ALTER TABLE mined_keywords ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'all'`
- **迁移**: `prisma/migrations/20260613000000_add_source_type_to_mined_keywords/`
