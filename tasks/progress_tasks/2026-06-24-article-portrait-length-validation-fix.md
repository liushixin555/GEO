# 2026-06-24 文章关联画像长度校验修复

## 问题现象

在文章创建或编辑页面选择关联画像后，保存文章时报错：

```text
参数验证失败: Too big: expected string to have <=2000 characters
```

该问题出现在画像内容较长时。前端会把选中的画像内容写入文章的 `portrait` 字段；当画像内容超过 2000 字符时，后端文章接口参数校验失败，导致无法保存文章。

## 原因定位

后端文章创建和更新接口使用 `apis/schema/article.schema.ts` 进行 Zod 参数校验。

原逻辑中 `portrait` 字段限制为：

```ts
portrait: z.string().max(2000).optional(),
```

但业务上画像会作为文章生成上下文使用，长度可能明显超过 2000 字符。数据库模型中 `Article.portrait` 为 `String?`，并未设置 `@db.VarChar(2000)`，因此当前瓶颈主要是 API schema 的人为限制。

## 修改方式

修改文件：

```text
apis/schema/article.schema.ts
```

新增文章上下文长度常量：

```ts
const ARTICLE_PROMPT_CONTEXT_MAX_LENGTH = 500_000;
```

将创建文章和更新文章中的 `portrait` 校验从 2000 放宽到 500000，并补充中文错误提示：

```ts
portrait: z.string().max(ARTICLE_PROMPT_CONTEXT_MAX_LENGTH, '画像内容不能超过500000个字符').optional(),
```

涉及接口：

```text
POST /api/v1/projects/:projectId/articles
PUT  /api/v1/projects/:projectId/articles/:id
```

## 验证过程

先执行静态验证：

```powershell
npx.cmd tsc -p tsconfig.api.json --noEmit
npm.cmd run lint
```

结果：

```text
TypeScript 校验通过
ESLint 校验通过
```

随后进行接口级端到端验证：

1. 使用 `sysadmin` 登录成功。
2. 创建临时项目。
3. 创建临时文章，并传入长度为 3364 字符的 `portrait` 字段。
4. 文章创建成功。
5. 删除临时文章成功。
6. 删除临时项目成功。

最终验证输出：

```text
login              : ok
companyId          : 1
projectId          : 2
portraitJsonLength : 3364
articleId          : 1
articleCreate      : ok
articleDeleted     : True
projectDeleted     : True
```

## 最终结论

画像内容超过 2000 字符时，文章创建接口已不再触发原来的长度校验错误。

原报错：

```text
参数验证失败: Too big: expected string to have <=2000 characters
```

已通过后端 schema 放宽校验解决。

## 注意事项

完整执行 `npm.cmd run build:api` 时曾遇到 Prisma Windows DLL 文件被占用：

```text
EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp -> query_engine-windows.dll.node
```

该问题与本次代码修改无关，通常是本地 dev 服务正在占用 Prisma 查询引擎文件。关闭正在运行的项目服务后再执行完整构建即可规避。
