# title.tsx 评审修复

**日期**: 2026-05-25
**评审文件**: tasks/review/title.tsx.md
**提交**: a70536d fix: title.tsx评审修复——消除循环依赖、修正废弃注释、suffix默认值改为空串

## 修复内容

| 问题编号 | 级别 | 修复内容 |
|---|---|---|
| P1-01 | HIGH | 消除 title.tsx ↔ title1.tsx 循环依赖：移除 heading1 导入，heading 命令改为显式定义属性 |
| P2-01 | MEDIUM | 修正 title.tsx 和 title1-6 废弃注释中 "Use titleX" 矛盾描述 |
| P2-04 | LOW | heading 命令不再 spread 继承 heading1，显式列出所有属性 |
| P3-01 | LOW | headingExecute 的 suffix 默认值从 prefix 改为空字符串 |
| P3-02 | LOW | 为 executeCommand 中 selection 参数选择添加意图注释 |
| P3-03 | LOW | 废弃注释补充版本信息 (Since v4.0.0, Will be removed in v5.0.0) |

## 技术要点

- 补丁文件命名从旧格式 `@uiw__react-md-editor@4.1.0.patch` 迁移到 patch-package v8 格式 `@uiw+react-md-editor+4.1.0.patch`
- 旧命名格式的补丁文件被 patch-package v8 识别为 "Unrecognized patch file"，实际从未被应用
- 修改范围：src/*.tsx + esm/*.js + lib/*.js（title + title1-6，共 15 个文件）
- title1-6 的 execute 函数添加了 `?? '# '` / `?? ''` 空值合并运算符
