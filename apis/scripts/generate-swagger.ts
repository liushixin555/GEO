/**
 * OpenAPI spec generator using Zod schemas + prisma-openapi merge.
 *
 * Usage:  npx ts-node apis/scripts/generate-swagger.ts
 *
 * 1. Builds OpenAPI paths from the central route registry (apis/openapi/routes.registry.ts).
 * 2. Converts Zod schemas to JSON Schema via z.toJSONSchema().
 * 3. Merges Prisma-generated model schemas (components/schemas) into the spec.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildOpenApiSpec } from '../openapi/build-spec';

const OUTPUT = resolve(__dirname, '../swagger-spec.json');

const spec = buildOpenApiSpec();
writeFileSync(OUTPUT, JSON.stringify(spec, null, 2), 'utf-8');

const pathCount = Object.keys(spec.paths).length;
const schemaCount = Object.keys(spec.components?.schemas ?? {}).length;
console.log(`Done: ${pathCount} paths, ${schemaCount} schemas.`);
console.log(`Output: ${OUTPUT}`);
