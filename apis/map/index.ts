import { Company, User, Skills, LlmModel, SystemConfig, Project, Article, ArticleVersion, PublishingPlatform, KnowledgeKeyword, KnowledgePortrait, KnowledgeImage } from '../entity';

export function mapCompany(prismaCompany: any): Company {
  return {
    id: prismaCompany.id,
    short_name: prismaCompany.shortName,
    full_name: prismaCompany.fullName,
    address: prismaCompany.address,
    contact_person: prismaCompany.contactPerson,
    contact_phone: prismaCompany.contactPhone,
    created_at: prismaCompany.createdAt,
    updated_at: prismaCompany.updatedAt,
  };
}

export function mapSkills(prismaSkills: any): Skills {
  return {
    id: prismaSkills.id,
    name: prismaSkills.name,
    category: prismaSkills.category,
    description: prismaSkills.description,
    status: prismaSkills.status,
    company_id: prismaSkills.companyId ?? null,
    created_by: prismaSkills.createdBy ?? null,
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
    api_key: prismaLlmModel.apiKey,
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
    keywords: prismaArticle.keywords,
    portrait: prismaArticle.portrait,
    images: prismaArticle.images,
    platforms: prismaArticle.platforms,
    skills: prismaArticle.skills,
    llm_model_id: prismaArticle.llmModelId ?? null,
    content: prismaArticle.content,
    version: prismaArticle.version,
    status: prismaArticle.status,
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
    project_id: prismaKeyword.projectId,
    keyword: prismaKeyword.keyword,
    created_by: prismaKeyword.createdBy ?? null,
    created_at: prismaKeyword.createdAt,
    updated_at: prismaKeyword.updatedAt,
  };
}

export function mapPortrait(prismaPortrait: any): KnowledgePortrait {
  return {
    id: prismaPortrait.id,
    project_id: prismaPortrait.projectId,
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
    project_id: prismaImage.projectId,
    title: prismaImage.title,
    description: prismaImage.description,
    image_url: prismaImage.imageUrl,
    created_by: prismaImage.createdBy ?? null,
    created_at: prismaImage.createdAt,
    updated_at: prismaImage.updatedAt,
  };
}
