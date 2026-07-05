export interface PublishedArticleLinkInput {
  article_id: number;
  schedule_id?: number | null;
  platform_name?: string | null;
  url: string;
}

export interface CitationDetectionSourceInput {
  url: string;
  title?: string | null;
  answer_snippet?: string | null;
  citation_snippet?: string | null;
  source_index?: number | null;
  raw_source?: unknown;
}

export interface CitationDetectionRunInput {
  article_id?: number | null;
  article_link_id?: number | null;
  project_id?: number | null;
  model_name: string;
  prompt?: string | null;
  answer?: string | null;
  sources: CitationDetectionSourceInput[];
}

export interface CitationAutoRunInput {
  project_id?: number | null;
  article_ids?: number[];
  article_link_ids?: number[];
  limit?: number;
  question_count?: number;
  platforms?: string[];
  force?: boolean;
}

export interface CitationDiagnosisAuth {
  userId?: number;
  role: string;
}

export interface CitationDiagnosisListParams {
  page: number;
  pageSize: number;
  projectId?: number;
  search?: string;
  status?: string;
}

export interface ICitationDiagnosisService {
  createPublishedLink(input: PublishedArticleLinkInput, auth: CitationDiagnosisAuth): Promise<any>;
  listPublishedLinks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
  createDetectionRun(input: CitationDetectionRunInput, auth: CitationDiagnosisAuth): Promise<any>;
  runAutomaticDetection(input: CitationAutoRunInput, auth: CitationDiagnosisAuth): Promise<any>;
  listLedger(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
  getLedgerDetails(articleId: number, auth: CitationDiagnosisAuth): Promise<any>;
  listDetectionRuns(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
  listMarks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
}
