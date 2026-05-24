import { toJSONSchema } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import { routes } from './routes.registry';
import type { RouteDescriptor, PathParam } from './types';

const PRISMA_SCHEMAS = resolve(__dirname, '../prisma-openapi/openapi.yaml');

interface OpenApiSpec {
  openapi: string;
  info: Record<string, string>;
  paths: Record<string, Record<string, Record<string, unknown>>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  tags: Array<{ name: string; description: string }>;
}

const TAG_DEFINITIONS: Array<{ name: string; description: string }> = [
  { name: '系统', description: '健康检查' },
  { name: '认证管理', description: '登录、登出、Token 验证、公司/项目选择' },
  { name: '公司管理', description: '公司 CRUD 与状态切换' },
  { name: '用户管理', description: '用户 CRUD 与角色分配' },
  { name: '项目管理', description: '项目 CRUD' },
  { name: '技能管理', description: '技能 CRUD' },
  { name: 'LLM 模型', description: '模型配置与启用状态' },
  { name: '系统配置', description: '全局系统参数' },
  { name: '发布平台', description: '发布平台管理与同步' },
  { name: '发布计划', description: '发布排期管理' },
  { name: '文件上传', description: '图片与文档上传' },
  { name: '文章管理', description: '文章 CRUD 与审核' },
  { name: '知识库', description: '知识库 CRUD 及子资源' },
  { name: '待办管理', description: '待办任务 CRUD 与流转' },
];

function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  return toJSONSchema(schema as Parameters<typeof toJSONSchema>[0], {
    target: 'openapi-3.0',
    io: 'input',
  }) as Record<string, unknown>;
}

function buildRequestBody(jsonSchema: Record<string, unknown>): Record<string, unknown> {
  return {
    required: true,
    content: {
      'application/json': { schema: jsonSchema },
    },
  };
}

function buildQueryParams(jsonSchema: Record<string, unknown>): Array<Record<string, unknown>> {
  const props = (jsonSchema.properties ?? {}) as Record<string, unknown>;
  const required = new Set(jsonSchema.required as string[] ?? []);
  return Object.entries(props).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.has(name),
    schema,
  }));
}

function buildPathParams(params: PathParam[]): Array<Record<string, unknown>> {
  return params.map(p => ({
    name: p.name,
    in: 'path',
    required: p.required ?? true,
    schema: p.schema ?? { type: 'string' },
    description: p.description,
  }));
}

function ensurePath(paths: OpenApiSpec['paths'], path: string): Record<string, Record<string, unknown>> {
  if (!paths[path]) paths[path] = {};
  return paths[path];
}

export function buildOpenApiSpec(): OpenApiSpec {
  const spec: OpenApiSpec = {
    openapi: '3.1.0',
    info: {
      title: '薄云商机倍增服务 API',
      version: '1.0.0',
      description: '薄云商机倍增服务 Enterprise Management Platform API',
    },
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {},
    },
    tags: [],
  };

  const usedTags = new Set<string>();

  for (const route of routes) {
    const pathObj = ensurePath(spec.paths, route.path);
    const operation: Record<string, unknown> = {
      summary: route.summary,
      tags: route.tags,
    };
    if (route.description) operation.description = route.description;

    // Validation schema → requestBody or parameters
    if (route.validate) {
      const jsonSchema = zodToJsonSchema(route.validate.schema);
      if (route.validate.source === 'body') {
        operation.requestBody = buildRequestBody(jsonSchema);
      } else if (route.validate.source === 'query') {
        const queryParams = buildQueryParams(jsonSchema);
        const pathParams = route.params ? buildPathParams(route.params) : [];
        operation.parameters = [...pathParams, ...queryParams];
      } else if (route.validate.source === 'params') {
        operation.parameters = buildPathParams(route.params ?? []);
      }
    } else if (route.params?.length) {
      operation.parameters = buildPathParams(route.params);
    }

    // Security
    if (!route.public) {
      operation.security = [{ bearerAuth: [] }];
    }

    // Responses
    operation.responses = {
      200: { description: 'OK' },
      400: { description: '参数验证失败' },
      401: { description: '未认证' },
      403: { description: '无权限' },
    };

    pathObj[route.method] = operation;
    route.tags.forEach(t => usedTags.add(t));
  }

  // Tags — only include tags that are actually used
  spec.tags = TAG_DEFINITIONS.filter(t => usedTags.has(t.name));

  // Merge Prisma model schemas
  mergePrismaSchemas(spec);

  return spec;
}

function mergePrismaSchemas(spec: OpenApiSpec): void {
  try {
    const prismaYaml = readFileSync(PRISMA_SCHEMAS, 'utf-8');
    const prismaSpec = yaml.load(prismaYaml) as Record<string, any>;

    if (prismaSpec?.components?.schemas) {
      spec.components.schemas = {
        ...spec.components.schemas,
        ...prismaSpec.components.schemas,
      };
      const modelCount = Object.keys(prismaSpec.components.schemas).length;
      console.log(`Merged ${modelCount} Prisma model schemas`);
    } else {
      console.warn('Warning: prisma-openapi output has no components/schemas, skipping merge.');
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.warn(`Warning: ${PRISMA_SCHEMAS} not found. Run 'prisma generate' first. Skipping model merge.`);
    } else {
      throw err;
    }
  }
}
