export { IAuthService } from './auth.service';
export { AuthServiceImpl } from './impl/auth.service.impl';
export { ICompanyService } from './company.service';
export { CompanyServiceImpl } from './impl/company.service.impl';
export { ISkillsService } from './skills.service';
export { SkillsServiceImpl } from './impl/skills.service.impl';
export { IUserService, UserListOptions } from './user.service';
export { UserServiceImpl } from './impl/user.service.impl';

import { IUserService } from './user.service';
import { UserServiceImpl } from './impl/user.service.impl';

export function createUserService(): IUserService {
  return new UserServiceImpl();
}
export { ILlmModelService } from './llm-model.service';
export { LlmModelServiceImpl } from './impl/llm-model.service.impl';

import { ILlmModelService } from './llm-model.service';
import { LlmModelServiceImpl } from './impl/llm-model.service.impl';

export function createLlmModelService(): ILlmModelService {
  return new LlmModelServiceImpl();
}
export { ISystemConfigService } from './system-config.service';
export { SystemConfigServiceImpl } from './impl/system-config.service.impl';
export { IPublishingPlatformService } from './publishing-platform.service';
export { PublishingPlatformServiceImpl } from './impl/publishing-platform.service.impl';
export { ITodoService } from './todo.service';
export { TodoServiceImpl } from './impl/todo.service.impl';
export { IArticleService, AuthContext as ArticleAuthContext } from './article.service';
export { ArticleServiceImpl } from './impl/article.service.impl';
export { IProjectService } from './project.service';
export { ProjectServiceImpl } from './impl/project.service.impl';

import { IArticleService } from './article.service';
import { ArticleServiceImpl } from './impl/article.service.impl';
import { IProjectService } from './project.service';
import { ProjectServiceImpl } from './impl/project.service.impl';

export function createArticleService(): IArticleService {
  return new ArticleServiceImpl();
}

export function createProjectService(): IProjectService {
  return new ProjectServiceImpl();
}
