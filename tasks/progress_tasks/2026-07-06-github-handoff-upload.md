# 2026-07-06 GitHub 交接上传

## 背景

用户要求将当前项目打包上传到 `https://github.com/liushixin555/GEO`，用于下一位同事接手。

## 本次处理

- 确认本地远端 `github` 已指向目标仓库。
- 当前工作分支为 `backup/current-20260705-before-skill-refactor`，跟踪 `github/backup/current-20260705-before-skill-refactor`。
- 本次交接提交纳入已跟踪配置变更和交接记录；运行日志、上传缓存、生成稿、误生成空文件以及 `.agents/` 下未跟踪文件不纳入交接提交。
- 用户本次明确要求上传，因此允许执行 `git push` 到目标 GitHub 仓库。

## 接手提示

- 开发与验证仍按项目根目录 `AGENTS.md` 执行：仅运行 `pnpm build`、`pnpm lint`，非明确要求不运行 `pnpm test`。
- 未跟踪的 `tmp/`、`skills/output/`、`qc`、`{console.error(e.message)` 属于本地临时产物或生成输出，接手前可按需人工确认后清理。
- `.agents/` 目录是只读参考资源，禁止修改、删除或测试；本次未将其中未跟踪文件加入提交。
