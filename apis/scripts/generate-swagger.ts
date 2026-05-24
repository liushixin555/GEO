/**
 * Swagger spec generator using swagger-autogen-ast + post-processing.
 *
 * Usage:  npx ts-node apis/scripts/generate-swagger.ts
 *
 * 1. Auto-discovers all Express routes via AST analysis (zero annotations).
 * 2. Post-processes the raw spec to add tags, security, descriptions.
 */
import { generateOpenApi } from 'swagger-autogen-ast';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../..');
const OUTPUT = resolve(__dirname, '../swagger-spec.json');

/* ── Tag rules: path prefix → tag + description ────────────────────── */
const TAG_RULES: { prefix: string; tag: string; description: string }[] = [
  { prefix: '/api/v1/auth', tag: '认证管理', description: '登录、登出、Token 验证、公司/项目选择' },
  { prefix: '/api/v1/companies', tag: '公司管理', description: '公司 CRUD 与状态切换' },
  { prefix: '/api/v1/users', tag: '用户管理', description: '用户 CRUD 与角色分配' },
  { prefix: '/api/v1/projects', tag: '项目管理', description: '项目 CRUD' },
  { prefix: '/api/v1/skills', tag: '技能管理', description: '技能 CRUD' },
  { prefix: '/api/v1/llm-models', tag: 'LLM 模型', description: '模型配置与启用状态' },
  { prefix: '/api/v1/system-configs', tag: '系统配置', description: '全局系统参数' },
  { prefix: '/api/v1/publishing-platforms', tag: '发布平台', description: '发布平台管理与同步' },
  { prefix: '/api/v1/publishing-schedule', tag: '发布计划', description: '发布排期管理' },
  { prefix: '/api/v1/upload', tag: '文件上传', description: '图片与文档上传' },
  { prefix: '/api/v1/todos', tag: '待办管理', description: '待办任务 CRUD 与流转' },
  { prefix: '/api/v1/knowledge-bases', tag: '知识库', description: '知识库 CRUD 及子资源' },
  { prefix: '/api/v1/knowledge-inventory', tag: '知识库', description: '知识库清单查询' },
];

/* ── Public paths (no JWT required) ─────────────────────────────────── */
const PUBLIC_PATHS = new Set([
  '/api/health',
]);

/* ── Operation descriptions ─────────────────────────────────────────── */
const OP_DESCRIPTIONS: Record<string, Record<string, string>> = {
  '/api/v1/auth/login':           { post: '用户登录，返回 JWT Token' },
  '/api/v1/auth/verify':          { get: '验证 Token 有效性' },
  '/api/v1/auth/logout':          { post: '用户登出（前端清除 Token）' },
  '/api/v1/auth/selection':       { put: '保存用户选择的公司/项目上下文' },
  '/api/v1/auth/companies':       { get: '获取当前用户可访问的公司列表' },
  '/api/v1/auth/companies/{id}':  { get: '获取指定公司的用户列表' },
  '/api/v1/auth/projects':        { get: '获取指定公司下可访问的项目列表' },
  '/api/v1/auth/context':         { get: '获取用户上下文（公司+项目）' },
};

/* ── Main ───────────────────────────────────────────────────────────── */
async function main() {
  console.log('Generating OpenAPI spec via swagger-autogen-ast...');

  // Step 1: generate raw spec via AST analysis
  await generateOpenApi({
    entryFile: resolve(PROJECT_ROOT, 'apis/app.ts'),
    outputFile: OUTPUT,
    tsconfigPath: resolve(PROJECT_ROOT, 'tsconfig.api.json'),
    info: {
      title: '薄云商机倍增服务 API',
      version: '1.0.0',
      description: '薄云商机倍增服务 Enterprise Management Platform API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  });

  // Step 2: read and post-process
  const spec: Record<string, any> = JSON.parse(readFileSync(OUTPUT, 'utf-8'));
  const paths = spec.paths ?? {};
  let enhanced = 0;

  for (const [path, ops] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(ops) as [string, any][]) {
      if (!['get','post','put','patch','delete'].includes(method)) continue;

      // Tags from prefix matching
      const rule = TAG_RULES.find(r => path.startsWith(r.prefix));
      if (rule) {
        if (!op.tags) op.tags = [];
        if (!op.tags.includes(rule.tag)) {
          op.tags.push(rule.tag);
          enhanced++;
        }
      }

      // Security (JWT) for non-public paths
      if (!PUBLIC_PATHS.has(path)) {
        if (!op.security) op.security = [];
        op.security.push({ bearerAuth: [] });
      }

      // Description
      const desc = OP_DESCRIPTIONS[path]?.[method];
      if (desc && !op.description) {
        op.description = desc;
      }

      // Ensure summary exists
      if (!op.summary) {
        op.summary = `${method.toUpperCase()} ${path}`;
      }
    }
  }

  // Collect unique tags for the top-level tags array
  const tagSet = new Set<string>();
  for (const ops of Object.values(paths) as any[]) {
    for (const op of Object.values(ops) as any[]) {
      if (Array.isArray(op?.tags)) op.tags.forEach((t: string) => tagSet.add(t));
    }
  }

  spec.tags = TAG_RULES
    .filter(r => tagSet.has(r.tag))
    .map(r => ({ name: r.tag, description: r.description }));

  writeFileSync(OUTPUT, JSON.stringify(spec, null, 2), 'utf-8');
  const pathCount = Object.keys(paths).length;
  console.log(`Done: ${pathCount} paths, ${enhanced} operations enhanced.`);
  console.log(`Output: ${OUTPUT}`);
}

main().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
