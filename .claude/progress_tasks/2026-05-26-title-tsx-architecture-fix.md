# title.tsx 架构评审修复（2026-05-26）

## 变更概述
根据 `tasks/review/title.tsx.md` 评审文件，修复 @uiw/react-md-editor 的 title.tsx/title1-6.tsx 8项评审问题。

## 修复清单
- P1-01: 消除循环依赖（title.tsx 不再导入 heading1）
- P1-02: 非空断言 prefix! 替换为防御性默认值 ?? '# '
- P2-01: 废弃注释统一为 `@deprecated Since v4.0.0. Use headingN instead.`
- P2-02: 全部 title.tsx/title1-6 改为 `import type`
- P2-03: 全部 title1-6 添加 role="img" aria-hidden + IBM Plex Sans + Carbon ink #161616
- P2-04: heading 显式定义所有属性（不使用 spread）
- P3-01: suffix 默认值从 `= prefix` 改为 `= ''`
- P3-02: title.tsx 废弃注释补充版本信息

## 关键变更
- `package.json`: 锁定 `@uiw/react-md-editor` 为 `4.1.0`（避免自动升级导致 patch 失效）
- `pnpm-workspace.yaml`: 注册 `patchedDependencies`
- `patches/@uiw__react-md-editor@4.1.0.patch`: 通过 `pnpm patch-commit` 正式生成的 patch

## pnpm patch 工作流
1. `pnpm patch @uiw/react-md-editor@4.1.0` 创建编辑目录
2. 转换行尾 `sed -i 's/\r$//'` 后应用旧 patch
3. 手动修复 `lib/Context.js` 唯一失败的 hunk
4. `pnpm patch-commit` 生成正式 patch

## 测试结果
- build: 通过
- lint: 通过
- test: 10445 通过 / 22 失败（均为 .agents/ 预存问题）
