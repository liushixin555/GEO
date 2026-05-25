import type { RouteDescriptor, RouteResponse } from './types';
import { loginSchema, saveSelectionSchema } from '../schema/auth.schema';
import { listUsersSchema, createUserSchema, updateUserSchema } from '../schema/user.schema';
import { createCompanySchema, updateCompanySchema, toggleCompanyStatusSchema } from '../schema/company.schema';
import { createProjectSchema, updateProjectSchema } from '../schema/project.schema';
import { createKnowledgeBaseSchema, updateKnowledgeBaseSchema } from '../schema/knowledge-base.schema';
import { createArticleSchema, updateArticleSchema, reviewArticleSchema, updateContentSchema, listArticlesSchema } from '../schema/article.schema';
import { createLlmModelSchema, updateLlmModelSchema } from '../schema/llm-model.schema';
import { updateSystemConfigsSchema } from '../schema/system-config.schema';
import { updatePublishingScheduleSchema } from '../schema/publishing-schedule.schema';
import { listPublishingPlatformsSchema } from '../schema/publishing-platform.schema';
import {
  listTodosSchema,
  createTodoSchema,
  updateTodoSchema,
  transferTodoSchema,
  objectOptionsSchema,
  assigneeCandidatesSchema,
} from '../schema/todo.schema';

const INT_ID = { name: 'id', description: 'ID', required: true, schema: { type: 'integer' } };
const INT_PROJECT_ID = { name: 'projectId', description: '项目ID', required: true, schema: { type: 'integer' } };
const INT_BASE_ID = { name: 'baseId', description: '知识库ID', required: true, schema: { type: 'integer' } };

const ref = (name: string): RouteResponse => ({ type: 'item', schema: { $ref: `#/components/schemas/${name}` } });
const list = (name: string): RouteResponse => ({ type: 'list', schema: { $ref: `#/components/schemas/${name}` } });
const voidR: RouteResponse = { type: 'void' };

export const routes: RouteDescriptor[] = [
  // ── 健康检查（公开）────────────────────────────────────────
  { method: 'get', path: '/api/health', summary: '健康检查', tags: ['系统'], public: true, response: voidR },

  // ── 认证管理 ────────────────────────────────────────────────
  { method: 'post', path: '/api/v1/auth/login', summary: '用户登录', description: '用户登录，返回 JWT Token', tags: ['认证管理'], public: true, validate: { schema: loginSchema, source: 'body' }, response: { type: 'item', schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } },
  { method: 'get',  path: '/api/v1/auth/verify', summary: '验证Token', description: '验证 Token 有效性', tags: ['认证管理'], response: { type: 'item', schema: { type: 'object', properties: { valid: { type: 'boolean' }, user: { $ref: '#/components/schemas/User' } } } } },
  { method: 'post', path: '/api/v1/auth/logout', summary: '用户登出', description: '用户登出（前端清除 Token）', tags: ['认证管理'], response: voidR },
  { method: 'put',  path: '/api/v1/auth/selection', summary: '保存选择', description: '保存用户选择的公司/项目上下文', tags: ['认证管理'], validate: { schema: saveSelectionSchema, source: 'body' }, response: voidR },
  { method: 'get',  path: '/api/v1/auth/companies', summary: '可访问公司列表', description: '获取当前用户可访问的公司列表', tags: ['认证管理'], response: list('Company') },
  { method: 'get',  path: '/api/v1/auth/companies/{id}', summary: '公司用户列表', description: '获取指定公司的用户列表', tags: ['认证管理'], params: [{ name: 'id', description: '公司ID', required: true, schema: { type: 'integer' } }], response: list('User') },
  { method: 'get',  path: '/api/v1/auth/projects', summary: '可访问项目列表', description: '获取指定公司下可访问的项目列表', tags: ['认证管理'], response: list('Project') },
  { method: 'get',  path: '/api/v1/auth/context', summary: '用户上下文', description: '获取用户上下文（公司+项目）', tags: ['认证管理'], response: { type: 'item', schema: { type: 'object', properties: { company: { $ref: '#/components/schemas/Company' }, project: { $ref: '#/components/schemas/Project' } } } } },

  // ── 公司管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/companies', summary: '公司列表', tags: ['公司管理'], response: list('Company') },
  { method: 'get',    path: '/api/v1/companies/{id}', summary: '公司详情', tags: ['公司管理'], params: [INT_ID], response: ref('Company') },
  { method: 'post',   path: '/api/v1/companies', summary: '创建公司', tags: ['公司管理'], validate: { schema: createCompanySchema, source: 'body' }, response: ref('Company') },
  { method: 'put',    path: '/api/v1/companies/{id}', summary: '更新公司', tags: ['公司管理'], params: [INT_ID], validate: { schema: updateCompanySchema, source: 'body' }, response: ref('Company') },
  { method: 'put',    path: '/api/v1/companies/{id}/status', summary: '切换公司状态', tags: ['公司管理'], params: [INT_ID], validate: { schema: toggleCompanyStatusSchema, source: 'body' }, response: ref('Company') },

  // ── 用户管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/users', summary: '用户列表', description: '分页查询用户列表（仅 sysadmin）', tags: ['用户管理'], validate: { schema: listUsersSchema, source: 'query' }, response: list('User') },
  { method: 'get',    path: '/api/v1/users/{id}', summary: '用户详情', tags: ['用户管理'], params: [INT_ID], response: ref('User') },
  { method: 'post',   path: '/api/v1/users', summary: '创建用户', tags: ['用户管理'], validate: { schema: createUserSchema, source: 'body' }, response: ref('User') },
  { method: 'put',    path: '/api/v1/users/{id}', summary: '更新用户', tags: ['用户管理'], params: [INT_ID], validate: { schema: updateUserSchema, source: 'body' }, response: ref('User') },
  { method: 'delete', path: '/api/v1/users/{id}', summary: '删除用户', tags: ['用户管理'], params: [INT_ID], response: voidR },

  // ── 项目管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/projects', summary: '项目列表', tags: ['项目管理'], response: list('Project') },
  { method: 'get',    path: '/api/v1/projects/{id}', summary: '项目详情', tags: ['项目管理'], params: [INT_ID], response: ref('Project') },
  { method: 'post',   path: '/api/v1/projects', summary: '创建项目', tags: ['项目管理'], validate: { schema: createProjectSchema, source: 'body' }, response: ref('Project') },
  { method: 'put',    path: '/api/v1/projects/{id}', summary: '更新项目', tags: ['项目管理'], params: [INT_ID], validate: { schema: updateProjectSchema, source: 'body' }, response: ref('Project') },
  { method: 'delete', path: '/api/v1/projects/{id}', summary: '删除项目', tags: ['项目管理'], params: [INT_ID], response: voidR },

  // ── 技能管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/skills', summary: '技能列表', tags: ['技能管理'], response: list('Skills') },
  { method: 'get',    path: '/api/v1/skills/{id}', summary: '技能详情', tags: ['技能管理'], params: [INT_ID], response: ref('Skills') },
  { method: 'post',   path: '/api/v1/skills', summary: '创建技能', tags: ['技能管理'], response: ref('Skills') },
  { method: 'put',    path: '/api/v1/skills/{id}', summary: '更新技能', tags: ['技能管理'], params: [INT_ID], response: ref('Skills') },
  { method: 'delete', path: '/api/v1/skills/{id}', summary: '删除技能', tags: ['技能管理'], params: [INT_ID], response: voidR },

  // ── LLM 模型 ───────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/llm-models/enabled', summary: '已启用模型列表', tags: ['LLM 模型'], response: list('LlmModel') },
  { method: 'get',    path: '/api/v1/llm-models', summary: '模型列表', tags: ['LLM 模型'], response: list('LlmModel') },
  { method: 'get',    path: '/api/v1/llm-models/{id}', summary: '模型详情', tags: ['LLM 模型'], params: [INT_ID], response: ref('LlmModel') },
  { method: 'post',   path: '/api/v1/llm-models', summary: '创建模型', tags: ['LLM 模型'], validate: { schema: createLlmModelSchema, source: 'body' }, response: ref('LlmModel') },
  { method: 'put',    path: '/api/v1/llm-models/{id}', summary: '更新模型', tags: ['LLM 模型'], params: [INT_ID], validate: { schema: updateLlmModelSchema, source: 'body' }, response: ref('LlmModel') },
  { method: 'delete', path: '/api/v1/llm-models/{id}', summary: '删除模型', tags: ['LLM 模型'], params: [INT_ID], response: voidR },

  // ── 系统配置 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/system-configs', summary: '获取系统配置', tags: ['系统配置'], response: list('SystemConfig') },
  { method: 'put',    path: '/api/v1/system-configs', summary: '更新系统配置', tags: ['系统配置'], validate: { schema: updateSystemConfigsSchema, source: 'body' }, response: list('SystemConfig') },

  // ── 发布平台 ────────────────────────────────────────────────
  { method: 'post',   path: '/api/v1/publishing-platforms/sync', summary: '同步发布平台', description: '从资源管理系统同步发布平台数据', tags: ['发布平台'], response: voidR },
  { method: 'get',    path: '/api/v1/publishing-platforms', summary: '发布平台列表', description: '支持分页、搜索、分类筛选和排序，无参数时返回全量数据（已废弃，建议使用分页）', tags: ['发布平台'], validate: { schema: listPublishingPlatformsSchema, source: 'query' }, response: list('PublishingPlatform') },

  // ── 发布计划 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/publishing-schedule', summary: '发布计划列表', description: '查询文章发布排期列表，admin 仅可见所属公司项目文章，view 仅可见授权项目文章', tags: ['发布计划'], response: list('Article') },
  { method: 'put',    path: '/api/v1/publishing-schedule/{id}', summary: '更新发布计划', description: '更新指定文章的发布排期时间和排期类型，admin 只能更新所属项目文章', tags: ['发布计划'], params: [INT_ID], validate: { schema: updatePublishingScheduleSchema, source: 'body' }, response: ref('Article') },

  // ── 文件上传 ────────────────────────────────────────────────
  { method: 'post',   path: '/api/v1/upload', summary: '上传图片', tags: ['文件上传'], response: { type: 'item', schema: { type: 'object', properties: { url: { type: 'string' }, filename: { type: 'string' } } } } },
  { method: 'post',   path: '/api/v1/upload/document', summary: '上传文档', tags: ['文件上传'], response: { type: 'item', schema: { type: 'object', properties: { url: { type: 'string' }, filename: { type: 'string' }, originalName: { type: 'string' } } } } },

  // ── 文章管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/projects/{projectId}/articles', summary: '文章列表', tags: ['文章管理'], params: [INT_PROJECT_ID], validate: { schema: listArticlesSchema, source: 'query' }, response: list('Article') },
  { method: 'get',    path: '/api/v1/projects/{projectId}/articles/{id}', summary: '文章详情', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], response: ref('Article') },
  { method: 'post',   path: '/api/v1/projects/{projectId}/articles', summary: '创建文章', tags: ['文章管理'], params: [INT_PROJECT_ID], validate: { schema: createArticleSchema, source: 'body' }, response: ref('Article') },
  { method: 'put',    path: '/api/v1/projects/{projectId}/articles/{id}', summary: '更新文章', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], validate: { schema: updateArticleSchema, source: 'body' }, response: ref('Article') },
  { method: 'delete', path: '/api/v1/projects/{projectId}/articles/{id}', summary: '删除文章', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], response: voidR },
  { method: 'put',    path: '/api/v1/projects/{projectId}/articles/{id}/review', summary: '审核文章', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], validate: { schema: reviewArticleSchema, source: 'body' }, response: ref('Article') },
  { method: 'put',    path: '/api/v1/projects/{projectId}/articles/{id}/regenerate', summary: '重新生成文章', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], response: ref('Article') },
  { method: 'put',    path: '/api/v1/projects/{projectId}/articles/{id}/content', summary: '更新文章内容', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], validate: { schema: updateContentSchema, source: 'body' }, response: ref('Article') },
  { method: 'put',    path: '/api/v1/projects/{projectId}/articles/{id}/submit-review', summary: '提交审核', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], response: ref('Article') },
  { method: 'get',    path: '/api/v1/projects/{projectId}/articles/{id}/versions', summary: '文章版本列表', tags: ['文章管理'], params: [INT_PROJECT_ID, INT_ID], response: list('ArticleVersion') },

  // ── 知识库 ──────────────────────────────────────────────────
  // 项目知识聚合
  { method: 'get', path: '/api/v1/projects/{projectId}/knowledge/keywords', summary: '项目关键词列表', tags: ['知识库'], params: [INT_PROJECT_ID], response: list('KnowledgeKeyword') },
  { method: 'get', path: '/api/v1/projects/{projectId}/knowledge/portraits', summary: '项目画像列表', tags: ['知识库'], params: [INT_PROJECT_ID], response: list('KnowledgePortrait') },
  { method: 'get', path: '/api/v1/projects/{projectId}/knowledge/images', summary: '项目图片列表', tags: ['知识库'], params: [INT_PROJECT_ID], response: list('KnowledgeImage') },
  { method: 'get', path: '/api/v1/projects/{projectId}/knowledge/documents', summary: '项目文档列表', tags: ['知识库'], params: [INT_PROJECT_ID], response: list('KnowledgeDocument') },

  // 知识库 CRUD
  { method: 'get',    path: '/api/v1/knowledge-bases', summary: '知识库列表', tags: ['知识库'], response: list('KnowledgeBase') },
  { method: 'get',    path: '/api/v1/knowledge-bases/{id}', summary: '知识库详情', tags: ['知识库'], params: [INT_ID], response: ref('KnowledgeBase') },
  { method: 'post',   path: '/api/v1/knowledge-bases', summary: '创建知识库', tags: ['知识库'], validate: { schema: createKnowledgeBaseSchema, source: 'body' }, response: ref('KnowledgeBase') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{id}', summary: '更新知识库', tags: ['知识库'], params: [INT_ID], validate: { schema: updateKnowledgeBaseSchema, source: 'body' }, response: ref('KnowledgeBase') },
  { method: 'delete', path: '/api/v1/knowledge-bases/{id}', summary: '删除知识库', tags: ['知识库'], params: [INT_ID], response: voidR },

  // 知识库清单
  { method: 'get', path: '/api/v1/knowledge-bases/inventory', summary: '知识库清单', tags: ['知识库'], response: { type: 'item', schema: { type: 'object', properties: { stats: { type: 'object', properties: { keyword: { type: 'integer' }, portrait: { type: 'integer' }, image: { type: 'integer' }, document: { type: 'integer' }, total: { type: 'integer' } } }, list: { type: 'array', items: { $ref: '#/components/schemas/KnowledgeBase' } }, total: { type: 'integer' } } } } },

  // 关键词
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/keywords', summary: '关键词列表', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgeKeyword') },
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/keywords/{id}', summary: '关键词详情', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeKeyword') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/keywords', summary: '创建关键词', tags: ['知识库'], params: [INT_BASE_ID], response: ref('KnowledgeKeyword') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/keywords/batch', summary: '批量创建关键词', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgeKeyword') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/keywords/expand', summary: '扩展关键词', tags: ['知识库'], params: [INT_BASE_ID], response: list('KeywordExpandedWord') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{baseId}/keywords/{id}', summary: '更新关键词', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeKeyword') },
  { method: 'delete', path: '/api/v1/knowledge-bases/{baseId}/keywords/{id}', summary: '删除关键词', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: voidR },
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/mined-keywords', summary: '挖掘关键词列表', tags: ['知识库'], params: [INT_BASE_ID], response: list('MinedKeyword') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/keywords/mine', summary: '挖掘关键词', tags: ['知识库'], params: [INT_BASE_ID], response: list('MinedKeyword') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/mined-keywords/save', summary: '保存挖掘关键词', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgeKeyword') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{baseId}/mined-keywords/batch-toggle', summary: '批量切换挖掘关键词', tags: ['知识库'], params: [INT_BASE_ID], response: voidR },
  { method: 'delete', path: '/api/v1/knowledge-bases/{baseId}/mined-keywords', summary: '删除挖掘关键词', tags: ['知识库'], params: [INT_BASE_ID], response: voidR },

  // 画像
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/portraits', summary: '画像列表', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgePortrait') },
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/portraits/{id}', summary: '画像详情', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgePortrait') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/portraits', summary: '创建画像', tags: ['知识库'], params: [INT_BASE_ID], response: ref('KnowledgePortrait') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{baseId}/portraits/{id}', summary: '更新画像', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgePortrait') },
  { method: 'delete', path: '/api/v1/knowledge-bases/{baseId}/portraits/{id}', summary: '删除画像', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: voidR },

  // 图片
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/images', summary: '图片列表', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgeImage') },
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/images/{id}', summary: '图片详情', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeImage') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/images', summary: '创建图片', tags: ['知识库'], params: [INT_BASE_ID], response: ref('KnowledgeImage') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{baseId}/images/{id}', summary: '更新图片', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeImage') },
  { method: 'delete', path: '/api/v1/knowledge-bases/{baseId}/images/{id}', summary: '删除图片', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: voidR },

  // 文档
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/documents', summary: '文档列表', tags: ['知识库'], params: [INT_BASE_ID], response: list('KnowledgeDocument') },
  { method: 'get',    path: '/api/v1/knowledge-bases/{baseId}/documents/{id}', summary: '文档详情', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeDocument') },
  { method: 'post',   path: '/api/v1/knowledge-bases/{baseId}/documents', summary: '创建文档', tags: ['知识库'], params: [INT_BASE_ID], response: ref('KnowledgeDocument') },
  { method: 'put',    path: '/api/v1/knowledge-bases/{baseId}/documents/{id}', summary: '更新文档', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: ref('KnowledgeDocument') },
  { method: 'delete', path: '/api/v1/knowledge-bases/{baseId}/documents/{id}', summary: '删除文档', tags: ['知识库'], params: [INT_BASE_ID, INT_ID], response: voidR },

  // ── 待办管理 ────────────────────────────────────────────────
  { method: 'get',    path: '/api/v1/todos', summary: '待办列表', tags: ['待办管理'], validate: { schema: listTodosSchema, source: 'query' }, response: list('Todo') },
  { method: 'get',    path: '/api/v1/todos/object-options', summary: '对象选项列表', tags: ['待办管理'], validate: { schema: objectOptionsSchema, source: 'query' }, response: { type: 'list', schema: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } } },
  { method: 'get',    path: '/api/v1/todos/assignee-candidates', summary: '候选人列表', tags: ['待办管理'], validate: { schema: assigneeCandidatesSchema, source: 'query' }, response: { type: 'list', schema: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, role: { type: 'string' } } } } },
  { method: 'get',    path: '/api/v1/todos/{id}', summary: '待办详情', tags: ['待办管理'], params: [INT_ID], response: ref('Todo') },
  { method: 'post',   path: '/api/v1/todos', summary: '创建待办', tags: ['待办管理'], validate: { schema: createTodoSchema, source: 'body' }, response: ref('Todo') },
  { method: 'put',    path: '/api/v1/todos/{id}', summary: '更新待办', tags: ['待办管理'], params: [INT_ID], validate: { schema: updateTodoSchema, source: 'body' }, response: ref('Todo') },
  { method: 'post',   path: '/api/v1/todos/{id}/close', summary: '关闭待办', tags: ['待办管理'], params: [INT_ID], response: ref('Todo') },
  { method: 'post',   path: '/api/v1/todos/{id}/reopen', summary: '重新打开待办', tags: ['待办管理'], params: [INT_ID], response: ref('Todo') },
  { method: 'post',   path: '/api/v1/todos/{id}/transfer', summary: '转交待办', tags: ['待办管理'], params: [INT_ID], validate: { schema: transferTodoSchema, source: 'body' }, response: ref('Todo') },
  { method: 'post',   path: '/api/v1/todos/{id}/reject', summary: '驳回待办', tags: ['待办管理'], params: [INT_ID], response: ref('Todo') },
  { method: 'get',    path: '/api/v1/todos/{id}/logs', summary: '待办操作日志', tags: ['待办管理'], params: [INT_ID], response: list('TodoLog') },
];
