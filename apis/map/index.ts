import { Company, CompanyListItem, User, Skills, SkillsDetail, LlmModel, SystemConfig, Project, Article, ArticleDetail, ArticleVersion, PublishingPlatform, KnowledgeKeyword, KnowledgePortrait, KnowledgeImage, KnowledgeDocument, KnowledgeBase, MinedKeyword, Todo, TodoLog, UserListItem } from '../entity';
import type { ArticleType, WriteMode, ArticleStatus } from '../entity';
import { validateSkills, validateImages } from '../entity/article.entity';
import type { PublishingSchedule, PublishingScheduleItem } from '../entity/publishing-schedule.entity';
import { Prisma, Company as PrismaCompany, User as PrismaUser } from '@prisma/client';
import { isEncrypted } from '../utils/encryption.util';
import { maskSensitiveValue } from '../constants/system-config';

export function mapCompany(prismaCompany: PrismaCompany): Company {
  return {
    id: prismaCompany.id,
    short_name: prismaCompany.shortName,
    full_name: prismaCompany.fullName,
    address: prismaCompany.address,
    contact_person: prismaCompany.contactPerson,
    contact_phone: prismaCompany.contactPhone,
    status: prismaCompany.status,
    created_by: prismaCompany.createdById ?? null,
    updated_by: prismaCompany.updatedById ?? null,
    created_at: prismaCompany.createdAt,
    updated_at: prismaCompany.updatedAt,
    deleted_at: prismaCompany.deletedAt,
  };
}

type SkillsWithCreator = Prisma.SkillsGetPayload<{ include: { creator: true } }>;

export function mapSkills(prismaSkills: SkillsWithCreator): SkillsDetail {
  return {
    id: prismaSkills.id,
    name: prismaSkills.name,
    description: prismaSkills.description,
    created_by: prismaSkills.createdBy ?? null,
    creator_name: prismaSkills.creator?.cnName || null,
    created_at: prismaSkills.createdAt,
    updated_at: prismaSkills.updatedAt,
    deleted_at: prismaSkills.deletedAt ?? null,
  };
}

export function mapUser(prismaUser: PrismaUser & { company?: { shortName: string } | null }): UserListItem {
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
    api_key: prismaLlmModel.apiKey
      ? isEncrypted(prismaLlmModel.apiKey)
        ? '****'
        : `${prismaLlmModel.apiKey.slice(0, 4)}****${prismaLlmModel.apiKey.slice(-4)}`
      : '',
    model_name: prismaLlmModel.modelName,
    status: prismaLlmModel.status,
    created_at: prismaLlmModel.createdAt,
    updated_at: prismaLlmModel.updatedAt,
  };
}

export function mapSystemConfig(prismaConfig: any): SystemConfig {
  const config_key = prismaConfig.configKey;
  return {
    id: prismaConfig.id,
    config_key,
    config_value: maskSensitiveValue(config_key, prismaConfig.configValue),
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

/** Prisma Article 查询结果类型（包含可选关联字段，适配 list/getById 等不同 include 场景） */
type ArticlePrismaInput = {
  id: number;
  projectId: number;
  title: string;
  articleType: string | null;
  writeMode: string | null;
  keywords: string | null;
  portrait: string | null;
  images: Prisma.JsonValue | null;
  skills: Prisma.JsonValue | null;
  llmModelId: number | null;
  content: string | null;
  version: number;
  status: string;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  creator?: { cnName: string | null } | null;
  _count?: { schedules?: number };
};

export function mapArticle(prismaArticle: ArticlePrismaInput): ArticleDetail {
  return {
    id: prismaArticle.id,
    project_id: prismaArticle.projectId,
    title: prismaArticle.title,
    article_type: (prismaArticle.articleType ?? null) as ArticleType | null,
    write_mode: (prismaArticle.writeMode ?? null) as WriteMode | null,
    keywords: prismaArticle.keywords,
    portrait: prismaArticle.portrait,
    images: validateImages(prismaArticle.images),
    skills: validateSkills(prismaArticle.skills),
    llm_model_id: prismaArticle.llmModelId ?? null,
    content: prismaArticle.content,
    version: Math.floor(prismaArticle.version),
    status: prismaArticle.status as ArticleStatus,
    created_by: prismaArticle.createdBy ?? null,
    created_at: prismaArticle.createdAt,
    updated_at: prismaArticle.updatedAt,
    deleted_at: prismaArticle.deletedAt ?? null,
    creator_name: prismaArticle.creator?.cnName || null,
    schedule_count: prismaArticle._count?.schedules ?? 0,
  };
}

type ArticleVersionPrismaInput = {
  id: number;
  articleId: number;
  version: number;
  content: string;
  createdBy: number | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export function mapArticleVersion(prismaVersion: ArticleVersionPrismaInput): ArticleVersion {
  return {
    id: prismaVersion.id,
    article_id: prismaVersion.articleId,
    version: Math.floor(prismaVersion.version),
    content: prismaVersion.content,
    created_by: prismaVersion.createdBy ?? null,
    created_at: prismaVersion.createdAt,
    deleted_at: prismaVersion.deletedAt ?? null,
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
    deleted_at: prismaKeyword.deletedAt ?? null,
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
    deleted_at: prismaPortrait.deletedAt ?? null,
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
    deleted_at: prismaImage.deletedAt ?? null,
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
    deleted_at: prismaDoc.deletedAt ?? null,
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
    deleted_at: prismaItem.deletedAt ?? null,
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

export function mapPublishingSchedule(prismaSchedule: any): PublishingSchedule {
  return {
    id: prismaSchedule.id,
    article_id: prismaSchedule.articleId,
    platforms: prismaSchedule.platforms,
    schedule_type: prismaSchedule.scheduleType ?? null,
    scheduled_publish_at: prismaSchedule.scheduledPublishAt ?? null,
    status: prismaSchedule.status,
    reject_reason: prismaSchedule.rejectReason ?? null,
    created_by: prismaSchedule.createdBy ?? null,
    created_at: prismaSchedule.createdAt,
    updated_at: prismaSchedule.updatedAt,
  };
}

export function mapPublishingScheduleItem(prismaItem: any): PublishingScheduleItem {
  return {
    id: prismaItem.id,
    article_id: prismaItem.articleId,
    title: prismaItem.article?.title || '',
    keywords: prismaItem.article?.keywords ?? null,
    article_type: prismaItem.article?.articleType ?? null,
    platforms: prismaItem.platforms,
    status: prismaItem.status,
    schedule_type: prismaItem.scheduleType ?? null,
    scheduled_publish_at: prismaItem.scheduledPublishAt ?? null,
    project_id: prismaItem.article?.projectId ?? 0,
    project_name: prismaItem.article?.project?.shortName || '',
    company_name: prismaItem.article?.project?.company?.shortName || '',
    created_by: prismaItem.createdBy ?? null,
    created_by_name: prismaItem.creator?.cnName || '',
    created_at: prismaItem.createdAt,
    updated_at: prismaItem.updatedAt,
  };
}
