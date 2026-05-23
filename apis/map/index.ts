import { Company, User, Skills, LlmModel, SystemConfig, Project, Article, ArticleVersion, PublishingPlatform, KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, KnowledgeDocument, KnowledgeBase, MinedKeyword, Todo, TodoLog } from '../entity';
import { Company as PrismaCompany } from '@prisma/client';

export function mapCompany(prismaCompany: PrismaCompany): Company {
  return {
    id: prismaCompany.id,
    short_name: prismaCompany.shortName,
    full_name: prismaCompany.fullName,
    address: prismaCompany.address,
    contact_person: prismaCompany.contactPerson,
    contact_phone: prismaCompany.contactPhone,
    status: prismaCompany.status,
    created_at: prismaCompany.createdAt,
    updated_at: prismaCompany.updatedAt,
    deleted_at: prismaCompany.deletedAt,
  };
}

export function mapSkills(prismaSkills: any): Skills {
  return {
    id: prismaSkills.id,
    name: prismaSkills.name,
    description: prismaSkills.description,
    skill_dir: prismaSkills.skillDir,
    created_by: prismaSkills.createdBy ?? null,
    creator_name: prismaSkills.creator?.cnName || null,
    created_at: prismaSkills.createdAt,
    updated_at: prismaSkills.updatedAt,
  };
}

export function mapUser(prismaUser: any): any {
  return {
    id: prismaUser.id,
    username: prismaUser.username,
    cn_name: prismaUser.cnName,
    role: prismaUser.role,
    status: prismaUser.status,
    company_id: prismaUser.companyId ?? null,
    company_name: prismaUser.company?.shortName || '',
    created_at: prismaUser.createdAt,
    updated_at: prismaUser.updatedAt,
  };
}

export function mapLlmModel(prismaLlmModel: any): LlmModel {
  return {
    id: prismaLlmModel.id,
    provider: prismaLlmModel.provider,
    base_url: prismaLlmModel.baseUrl,
    api_key: prismaLlmModel.apiKey ? `${prismaLlmModel.apiKey.slice(0, 4)}****${prismaLlmModel.apiKey.slice(-4)}` : '',
    model_name: prismaLlmModel.modelName,
    status: prismaLlmModel.status,
    created_at: prismaLlmModel.createdAt,
    updated_at: prismaLlmModel.updatedAt,
  };
}

export function mapSystemConfig(prismaConfig: any): SystemConfig {
  return {
    id: prismaConfig.id,
    config_key: prismaConfig.configKey,
    config_value: prismaConfig.configValue,
    created_at: prismaConfig.createdAt,
    updated_at: prismaConfig.updatedAt,
  };
}

export function mapProject(prismaProject: any): Project {
  const operators: any[] = prismaProject.operators || [];
  const viewers: any[] = prismaProject.viewers || [];
  return {
    id: prismaProject.id,
    short_name: prismaProject.shortName,
    full_name: prismaProject.fullName,
    description: prismaProject.description,
    company_id: prismaProject.companyId,
    company_name: prismaProject.company?.shortName || '',
    operator_ids: operators.map((op: any) => op.user?.id ?? op.userId),
    operator_names: operators.map((op: any) => op.user?.cnName || ''),
    viewer_ids: viewers.map((v: any) => v.user?.id ?? v.userId),
    viewer_names: viewers.map((v: any) => v.user?.cnName || ''),
    status: prismaProject.status,
    created_at: prismaProject.createdAt,
    updated_at: prismaProject.updatedAt,
  };
}

export function mapArticle(prismaArticle: any): Article {
  return {
    id: prismaArticle.id,
    project_id: prismaArticle.projectId,
    title: prismaArticle.title,
    article_type: prismaArticle.articleType ?? null,
    write_mode: prismaArticle.writeMode ?? null,
    keywords: prismaArticle.keywords,
    portrait: prismaArticle.portrait,
    images: prismaArticle.images,
    platforms: prismaArticle.platforms,
    skills: prismaArticle.skills,
    llm_model_id: prismaArticle.llmModelId ?? null,
    content: prismaArticle.content,
    version: prismaArticle.version,
    status: prismaArticle.status,
    scheduled_publish_at: prismaArticle.scheduledPublishAt ?? null,
    created_by: prismaArticle.createdBy ?? null,
    created_at: prismaArticle.createdAt,
    updated_at: prismaArticle.updatedAt,
  };
}

export function mapArticleVersion(prismaVersion: any): ArticleVersion {
  return {
    id: prismaVersion.id,
    article_id: prismaVersion.articleId,
    version: prismaVersion.version,
    content: prismaVersion.content,
    created_by: prismaVersion.createdBy ?? null,
    created_at: prismaVersion.createdAt,
  };
}

export function mapPublishingPlatform(prismaPlatform: any): PublishingPlatform {
  return {
    id: prismaPlatform.id,
    rm_resource_id: prismaPlatform.rmResourceId,
    name: prismaPlatform.name,
    taxonomy: prismaPlatform.taxonomy,
    price: prismaPlatform.price,
    remark: prismaPlatform.remark,
    include_rate: prismaPlatform.includeRate,
    publish_rate: prismaPlatform.publishRate,
    created_at: prismaPlatform.createdAt,
    updated_at: prismaPlatform.updatedAt,
  };
}

export function mapKeyword(prismaKeyword: any): KnowledgeKeyword {
  return {
    id: prismaKeyword.id,
    base_id: prismaKeyword.baseId,
    keyword: prismaKeyword.keyword,
    seed_word: prismaKeyword.seedWord ?? null,
    group_id: prismaKeyword.groupId ?? null,
    created_by: prismaKeyword.createdBy ?? null,
    created_at: prismaKeyword.createdAt,
    updated_at: prismaKeyword.updatedAt,
  };
}

export function mapPortrait(prismaPortrait: any): KnowledgePortrait {
  return {
    id: prismaPortrait.id,
    base_id: prismaPortrait.baseId,
    title: prismaPortrait.title,
    content: prismaPortrait.content,
    created_by: prismaPortrait.createdBy ?? null,
    created_at: prismaPortrait.createdAt,
    updated_at: prismaPortrait.updatedAt,
  };
}

export function mapKnowledgeImage(prismaImage: any): KnowledgeImage {
  return {
    id: prismaImage.id,
    base_id: prismaImage.baseId,
    title: prismaImage.title,
    description: prismaImage.description,
    image_url: prismaImage.imageUrl,
    created_by: prismaImage.createdBy ?? null,
    created_at: prismaImage.createdAt,
    updated_at: prismaImage.updatedAt,
  };
}

export function mapKnowledgeDocument(prismaDoc: any): KnowledgeDocument {
  return {
    id: prismaDoc.id,
    base_id: prismaDoc.baseId,
    title: prismaDoc.title,
    description: prismaDoc.description,
    file_url: prismaDoc.fileUrl,
    file_name: prismaDoc.fileName,
    file_type: prismaDoc.fileType,
    file_size: prismaDoc.fileSize,
    created_by: prismaDoc.createdBy ?? null,
    created_at: prismaDoc.createdAt,
    updated_at: prismaDoc.updatedAt,
  };
}

export function mapMinedKeyword(prismaItem: any): MinedKeyword {
  return {
    id: prismaItem.id,
    base_id: prismaItem.baseId,
    keyword: prismaItem.keyword,
    selected: prismaItem.selected,
    created_by: prismaItem.createdBy ?? null,
    created_at: prismaItem.createdAt,
  };
}

export function mapTodo(prismaTodo: any): Todo {
  return {
    id: prismaTodo.id,
    title: prismaTodo.title,
    company_id: prismaTodo.companyId,
    company_name: prismaTodo.company?.shortName || '',
    project_id: prismaTodo.projectId ?? null,
    project_name: prismaTodo.project?.shortName || null,
    object_type: prismaTodo.objectType,
    object_id: prismaTodo.objectId ?? null,
    action: prismaTodo.action,
    source: prismaTodo.source,
    priority: prismaTodo.priority,
    assignee_id: prismaTodo.assigneeId,
    assignee_name: prismaTodo.assignee?.cnName || '',
    status: prismaTodo.status,
    created_by_id: prismaTodo.createdById,
    created_by_name: prismaTodo.createdBy?.cnName || '',
    due_at: prismaTodo.dueAt?.toISOString() || null,
    created_at: prismaTodo.createdAt,
    updated_at: prismaTodo.updatedAt,
  };
}

export function mapTodoLog(prismaLog: any): TodoLog {
  return {
    id: prismaLog.id,
    todo_id: prismaLog.todoId,
    operator_id: prismaLog.operatorId,
    operator_name: prismaLog.operator?.cnName || '',
    action: prismaLog.action,
    object_type: prismaLog.objectType ?? null,
    object_id: prismaLog.objectId ?? null,
    remark: prismaLog.remark ?? null,
    created_at: prismaLog.createdAt,
  };
}
