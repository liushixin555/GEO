// === Imports ===

// Auth
import { IAuthService } from './auth.service';
import { AuthServiceImpl } from './impl/auth.service.impl';

// Company
import { ICompanyService } from './company.service';
import { CompanyServiceImpl } from './impl/company.service.impl';

// Skills
import { ISkillsService } from './skills.service';
import { SkillsServiceImpl } from './impl/skills.service.impl';

// User
import { IUserService, UserListOptions } from './user.service';
import { UserServiceImpl } from './impl/user.service.impl';

// LlmModel
import { ILlmModelService } from './llm-model.service';
import { LlmModelServiceImpl } from './impl/llm-model.service.impl';

// SystemConfig
import { ISystemConfigService } from './system-config.service';
import { SystemConfigServiceImpl } from './impl/system-config.service.impl';

// PublishingPlatform
import { IPublishingPlatformService } from './publishing-platform.service';
import { PublishingPlatformServiceImpl } from './impl/publishing-platform.service.impl';

// Todo
import { ITodoService } from './todo.service';
import { TodoServiceImpl } from './impl/todo.service.impl';

// Article
import { IArticleService, AuthContext } from './article.service';
import { ArticleServiceImpl } from './impl/article.service.impl';

// Project
import { IProjectService } from './project.service';
import { ProjectServiceImpl } from './impl/project.service.impl';

// Knowledge
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

// KnowledgeBase
import { IKnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseServiceImpl } from './impl/knowledge-base.service.impl';

// Llm
import { ILlmService, ArticleGenerationParams } from './llm.service';
import { LlmServiceImpl } from './impl/llm.service.impl';

// SkillsFile
import { ISkillsFileService, SkillZipResult, SkillsFileServiceImpl } from './skills-file.service';

// === Re-exports (interfaces & types only, no implementation classes) ===

export { IAuthService };
export { ICompanyService };
export { ISkillsService };
export { IUserService, UserListOptions };
export { ILlmModelService };
export { ISystemConfigService };
export { IPublishingPlatformService };
export { ITodoService };
export { IArticleService, AuthContext };
export { IProjectService };
export { IKeywordService, IPortraitService, IImageService, IDocumentService, IMinedKeywordService };
export { IKnowledgeBaseService };
export { ILlmService, ArticleGenerationParams };
export { ISkillsFileService, SkillZipResult };

// === Factory Functions ===

export function createAuthService(): IAuthService {
  return new AuthServiceImpl();
}

export function createCompanyService(): ICompanyService {
  return new CompanyServiceImpl();
}

export function createSkillsService(): ISkillsService {
  return new SkillsServiceImpl();
}

export function createUserService(): IUserService {
  return new UserServiceImpl();
}

export function createLlmModelService(): ILlmModelService {
  return new LlmModelServiceImpl();
}

export function createSystemConfigService(): ISystemConfigService {
  return new SystemConfigServiceImpl();
}

export function createPublishingPlatformService(): IPublishingPlatformService {
  return new PublishingPlatformServiceImpl();
}

export function createTodoService(): ITodoService {
  return new TodoServiceImpl();
}

export function createArticleService(): IArticleService {
  return new ArticleServiceImpl();
}

export function createProjectService(): IProjectService {
  return new ProjectServiceImpl();
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

export function createKnowledgeBaseService(): IKnowledgeBaseService {
  return new KnowledgeBaseServiceImpl();
}

export function createLlmService(): ILlmService {
  return new LlmServiceImpl();
}

export function createSkillsFileService(): ISkillsFileService {
  return new SkillsFileServiceImpl();
}
