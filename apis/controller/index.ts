/**
 * Controller 聚合导出文件（barrel file）
 *
 * 将所有 controller 模块的公开函数统一重新导出。
 * 新增 controller 或新增导出函数时，必须同步更新此文件。
 */

// === 认证 ===
export { login, logout, verify, saveSelection, getAccessibleCompanies, getAccessibleProjects, getContext, getCompanyDetail } from './auth.controller';

// === 基础数据 ===
export { listCompanies, getCompany, createCompany, updateCompany, toggleCompanyStatus } from './company.controller';
export { listUsers, getUser, createUser, updateUser, deleteUser } from './user.controller';
export { uploadSkillMiddleware, listSkills, getSkills, createSkills, updateSkills, deleteSkills } from './skills.controller';

// === 项目管理 ===
export { listProjects, getProject, createProject, updateProject, deleteProject } from './project.controller';

// === 文章管理 ===
export { listArticles, getArticle, createArticle, updateArticle, updateArticleContent, deleteArticle, reviewArticle, regenerateArticle, submitForReview, listArticleVersions } from './article.controller';

// === 知识库 ===
export { listKeywords, getKeyword, createKeyword, updateKeyword, deleteKeyword, batchCreateKeywords, expandKeywords, listPortraits, getPortrait, createPortrait, updatePortrait, deletePortrait, listImages, getImage, createImage, updateImage, deleteImage, listDocuments, getDocument, createDocument, updateDocument, deleteDocument, listProjectKeywords, listProjectPortraits, listProjectImages, listProjectDocuments, listInventory, listMinedKeywords, mineKeywords, saveMinedKeywords, toggleMinedKeywordsBatch, deleteMinedKeywords } from './knowledge.controller';
export { listKnowledgeBases, getKnowledgeBase, createKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase } from './knowledge-base.controller';

// === 发布管理 ===
export { syncPublishingPlatforms, listPublishingPlatforms } from './publishing-platform.controller';
export { listPublishingSchedule, updatePublishingSchedule } from './publishing-schedule.controller';

// === LLM 模型 ===
export { listLlmModels, listEnabledLlmModels, getLlmModel, createLlmModel, updateLlmModel, deleteLlmModel } from './llm-model.controller';

// === 系统配置 ===
export { getSystemConfigs, updateSystemConfigs } from './system-config.controller';

// === 待办事项 ===
export { listTodos, getTodo, createTodo, updateTodo, closeTodo, reopenTodo, transferTodo, rejectTodo, getTodoLogs, getObjectOptions, getAssigneeCandidates } from './todo.controller';

// === 文件上传 ===
export { uploadFile } from './upload.controller';
export { uploadDocumentFile } from './upload-document.controller';
