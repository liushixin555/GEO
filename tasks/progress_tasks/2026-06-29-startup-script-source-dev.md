# 启动脚本改为源码开发模式

## 背景

桌面 `启动项目.bat` 使用 `node dist/apis/server.js` 启动后端，导致源码修改后如果未成功重新构建，运行服务仍会加载旧的 `dist` 产物。桌面快捷方式也指向旧目录 `D:\GEO\git_code\by_geo`。

## 修改内容

- `启动项目.bat`: 后端启动命令改为 `npm run dev:api`，前端继续使用 `npm run dev:page`。
- 启动前会停止旧的 `dist/apis/server.js`、`apis/server.ts`、Vite 相关 Node 进程，避免端口被旧服务占用。
- 桌面 `C:\Users\shixi\Desktop\启动项目.bat` 已同步更新。
- 桌面快捷方式 `薄云商机倍增服务一键启动.lnk` 已改为指向桌面新版启动脚本，工作目录为 `D:\GEO\git_code\GEO`。

## 验收标准

- 桌面启动脚本不再使用旧的 `dist/apis/server.js` 作为后端入口。
- 快捷方式不再指向 `D:\GEO\git_code\by_geo`。
- 后端以当前源码 `apis/server.ts` 启动，避免旧编译产物造成线上行为滞后。
