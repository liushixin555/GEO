/**
 * Service Layer Barrel — 统一公共入口
 *
 * 设计意图：
 * - 作为 Service 层唯一对外导出点，消费者（controller）仅通过 '../service' 导入
 * - 导出接口类型（供类型标注）+ 工厂函数（供实例化），不导出实现类
 * - 工厂函数将消费者与具体实现解耦，支持后续替换实现（mock 测试、更换 ORM 等）
 *
 * 分组规则（按业务域）：
 *   1. 认证域 — Auth, User
 *   2. 内容域 — Article, Project, Todo, PublishingPlatform
 *   3. 知识域 — KnowledgeBase, Keyword, Portrait, Image, Document, MinedKeyword
 *   4. 系统域 — Company, Skills, SkillsFile, LlmModel, Llm, SystemConfig
 */

// ============================================================================
// Section 1: Imports
// ============================================================================

// --- 认证域 ---
import { IAuthService } from './auth.service';
import { AuthServiceImpl } from './impl/auth.service.impl';

import { IUserService, UserListOptions } from './user.service';
import { UserServiceImpl } from './impl/user.service.impl';

// --- 内容域 ---
import { IArticleService } from './article.service';
import { AuthContext } from '../types/auth';
import { ArticleServiceImpl } from './impl/article.service.impl';

import { IProjectService } from './project.service';
import { ProjectServiceImpl } from './impl/project.service.impl';

import { ITodoService } from './todo.service';
import { TodoServiceImpl } from './impl/todo.service.impl';

import { IPublishingPlatformService } from './publishing-platform.service';
import { PublishingPlatformServiceImpl } from './impl/publishing-platform.service.impl';

import { IPublishingScheduleService } from './publishing-schedule.service';
import { PublishingScheduleServiceImpl } from './impl/publishing-schedule.service.impl';
import { IPublishingExecutionService } from './publishing-execution.service';
import { PublishingExecutionServiceImpl } from './impl/publishing-execution.service.impl';
import { IPublishingOrderSyncService, PublishingOrderSyncResult } from './publishing-order-sync.service';
import { PublishingOrderSyncServiceImpl } from './impl/publishing-order-sync.service.impl';
import { ICitationDiagnosisService } from './citation-diagnosis.service';
import { CitationDiagnosisServiceImpl } from './impl/citation-diagnosis.service.impl';

// --- 知识域 ---
import { IKnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseServiceImpl } from './impl/knowledge-base.service.impl';

import {
  IKeywordService,
  IPortraitService,
  IImageService,
  IDocumentService,
  IMinedKeywordService,
} from './knowledge.service';
import {
  KeywordServiceImpl,
  PortraitServiceImpl,
  ImageServiceImpl,
  DocumentServiceImpl,
  MinedKeywordServiceImpl,
} from './impl/knowledge.service.impl';

// --- 系统域 ---
import { ICompanyService } from './company.service';
import { CompanyServiceImpl } from './impl/company.service.impl';

import { ISkillsService } from './skills.service';
import { SkillsServiceImpl } from './impl/skills.service.impl';

import { ISkillsFileService, SkillZipResult } from './skills-file.service';
import { SkillsFileServiceImpl } from './impl/skills-file.service.impl';

import { ILlmModelService } from './llm-model.service';
import { LlmModelServiceImpl } from './impl/llm-model.service.impl';

import { ILlmService, ArticleGenerationParams } from './llm.service';
import { LlmServiceImpl } from './impl/llm.service.impl';

import { ISystemConfigService } from './system-config.service';
import { SystemConfigServiceImpl } from './impl/system-config.service.impl';

import { IAuditLogService } from './audit-log.service';
import { AuditLogServiceImpl } from './impl/audit-log.service.impl';

// ============================================================================
// Section 2: Re-exports (interfaces & types only)
// ============================================================================

// 认证域
export { IAuthService };
export { IUserService, UserListOptions };

// 内容域
export { IArticleService };
export { AuthContext } from '../types/auth';
export { IProjectService };
export { ITodoService };
export { IPublishingPlatformService };
export { IPublishingScheduleService };
export { IPublishingExecutionService };
export { IPublishingOrderSyncService, PublishingOrderSyncResult };
export { ICitationDiagnosisService };

// 知识域
export { IKnowledgeBaseService };
export { IKeywordService, IPortraitService, IImageService, IDocumentService, IMinedKeywordService };

// 系统域
export { ICompanyService };
export { ISkillsService };
export { ISkillsFileService, SkillZipResult };
export { ILlmModelService };
export { ILlmService, ArticleGenerationParams };
export { ISystemConfigService };

// 审计域
export { IAuditLogService };

// ============================================================================
// Section 3: Factory Functions
// ============================================================================

// 认证域
export function createAuthService(): IAuthService {
  return new AuthServiceImpl();
}

export function createUserService(): IUserService {
  return new UserServiceImpl();
}

// 内容域
export function createArticleService(): IArticleService {
  return new ArticleServiceImpl();
}

export function createProjectService(): IProjectService {
  return new ProjectServiceImpl();
}

export function createTodoService(): ITodoService {
  return new TodoServiceImpl();
}

export function createPublishingPlatformService(): IPublishingPlatformService {
  return new PublishingPlatformServiceImpl();
}

export function createPublishingScheduleService(): IPublishingScheduleService {
  return new PublishingScheduleServiceImpl();
}

export function createPublishingExecutionService(): IPublishingExecutionService {
  return new PublishingExecutionServiceImpl();
}

export function createPublishingOrderSyncService(): IPublishingOrderSyncService {
  return new PublishingOrderSyncServiceImpl();
}

export function createCitationDiagnosisService(): ICitationDiagnosisService {
  return new CitationDiagnosisServiceImpl();
}

// 知识域
export function createKnowledgeBaseService(): IKnowledgeBaseService {
  return new KnowledgeBaseServiceImpl();
}

export function createKeywordService(): IKeywordService {
  return new KeywordServiceImpl();
}

export function createPortraitService(): IPortraitService {
  return new PortraitServiceImpl();
}

export function createImageService(): IImageService {
  return new ImageServiceImpl();
}

export function createDocumentService(): IDocumentService {
  return new DocumentServiceImpl();
}

export function createMinedKeywordService(): IMinedKeywordService {
  return new MinedKeywordServiceImpl();
}

// 系统域
export function createCompanyService(): ICompanyService {
  return new CompanyServiceImpl();
}

export function createSkillsService(): ISkillsService {
  return new SkillsServiceImpl();
}

export function createSkillsFileService(): ISkillsFileService {
  return new SkillsFileServiceImpl();
}

export function createLlmModelService(): ILlmModelService {
  return new LlmModelServiceImpl();
}

export function createLlmService(): ILlmService {
  return new LlmServiceImpl();
}

export function createSystemConfigService(): ISystemConfigService {
  return new SystemConfigServiceImpl();
}

// 审计域
export function createAuditLogService(): IAuditLogService {
  return new AuditLogServiceImpl();
}
