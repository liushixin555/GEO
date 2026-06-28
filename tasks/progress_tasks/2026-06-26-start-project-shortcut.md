# 2026-06-26 一键启动脚本稳定性优化

## 变更内容

- 优化 `scripts/start-project.cmd`：
  - 启动 PostgreSQL 后循环等待 5432 端口可用。
  - PostgreSQL 未就绪时停止启动项目，避免前端打开后登录失败。
  - `Start-Service` 权限不足时提示使用管理员权限运行快捷方式。
  - 保留 3000/8080 已运行时只打开浏览器的逻辑。

## 本机快捷方式

- 已创建桌面快捷方式：
  `C:\Users\shixi\Desktop\薄云商机倍增服务一键启动.lnk`
- 目标：
  `D:\GEO\git_code\by_geo\scripts\start-project.cmd`
- 工作目录：
  `D:\GEO\git_code\by_geo`
- 快捷键：
  `Ctrl + Alt + G`
- 已设置管理员运行标记。

## 使用说明

- 开机后双击桌面快捷方式，或按 `Ctrl + Alt + G`。
- 脚本会先确认 PostgreSQL 服务和 5432 端口可用，再启动项目并打开 `http://localhost:3000/`。
