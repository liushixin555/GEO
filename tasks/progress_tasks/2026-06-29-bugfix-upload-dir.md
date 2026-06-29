# uploadDir 路径修复

## 日期
2026-06-29

## 问题
知识库模块文档下载返回 {"code":404,"message":"接口不存在"}。

## 根因
pis/config/index.ts 的 esolveUploadDir 使用 path.resolve(__dirname, '..', '..', '..', 'uploads') 硬编码三级上溯：
- 从 dist/ 运行时：正确解析到 项目根目录/uploads/
- 从 ts-node 源码运行时：__dirname 比 dist 浅一级，多翻一层，解析到 项目父目录/uploads/
- 上传时从 ts-node 运行，文件存到错误目录；运行时从 dist/ 运行，从正确目录读取（空），导致 404

## 修复
1. pis/config/index.ts：esolveUploadDir 改为上溯查找 package.json 确定项目根目录
2. 复制 ../uploads/ 的 6 个文件到 uploads/
3. 编译更新 dist/apis/config/index.js

## 涉及文件
- apis/config/index.ts
- dist/apis/config/index.js
- .Codex/rules.md
