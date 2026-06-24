# AI 引用诊断第一版

## 背景

需要检测已发布文章是否出现在 AI 联网搜索回答的引用来源中。规则是：某篇文章只要被某个模型引用过一次，就永久保留“被该模型引用”的标签，后续检测未命中也不删除该标签。

## 本次实现

第一版实现离线可测闭环，不调用真实 AI，不触发真实发布。

### 数据模型

- `published_article_links`：保存我方已发布文章链接。
- `ai_citation_detection_runs`：保存一次检测批次。
- `ai_citation_records`：保存一次检测中抓取到的引用来源 URL。
- `article_model_citation_marks`：保存文章被某模型引用过的永久标签。

### 后端接口

- `GET /api/v1/citation-diagnosis/links`
- `POST /api/v1/citation-diagnosis/links`
- `GET /api/v1/citation-diagnosis/runs`
- `POST /api/v1/citation-diagnosis/runs`
- `GET /api/v1/citation-diagnosis/marks`

### 匹配规则

发布链接和引用来源都会先做 URL 规范化：

- 忽略 `http` / `https` 差异。
- 统一小写域名。
- 将 `m.` 移动端域名前缀归一为 `www.`。
- 去除末尾 `/`。
- 去除 `utm_*`、`spm` 等追踪参数。

检测来源 URL 命中已发布链接后，会写入 `article_model_citation_marks`。后续未命中检测不会删除已有标签。

### 前端页面

新增菜单：`检测管理`

页面包含：

- 引用标签
- 检测记录
- 发布链接

第一版支持手工添加发布链接、手工录入检测引用来源，用于模拟 AI 返回的 citations/search references。

## 验证

- `tsc --noEmit --project tsconfig.api.json` 通过。
- `tsc --noEmit --project tsconfig.page.json` 通过。
- `npm.cmd run lint` 通过。
- 静态路由检查确认 citation diagnosis 接口已挂载。
- URL 规范化测试通过：`http://m.example.com/a/b/?utm_source=x&spm=1` 与 `https://www.example.com/a/b` 匹配为同一规范 URL。

## 注意

本次新增 Prisma schema 和 migration。当前 `npm.cmd run db:generate` 被运行中的 Node 后端进程锁住 Prisma DLL，报 `EPERM`。完整数据库接口测试前，需要先停止当前 dev 服务，再执行：

```powershell
npm.cmd run db:migrate
npm.cmd run db:generate
npm.cmd run dev
```
