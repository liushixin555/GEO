import type { z } from 'zod';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type ValidationSource = 'body' | 'query' | 'params';

export interface PathParam {
  name: string;
  description: string;
  required?: boolean;
  schema?: Record<string, unknown>;
}

export type ResponseType = 'item' | 'list' | 'void';

export interface RouteResponse {
  type?: ResponseType;
  schema?: Record<string, unknown>;
}

export interface RouteDescriptor {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  public?: boolean;
  validate?: {
    schema: z.ZodType;
    source: ValidationSource;
  };
  params?: PathParam[];
  response?: RouteResponse;
}
