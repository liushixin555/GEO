export interface PublishedArticleLinkInput {
  article_id: number;
  schedule_id?: number | null;
  platform_name?: string | null;
  url: string;
}

export interface CitationDetectionSourceInput {
  url: string;
  title?: string | null;
}

export interface CitationDetectionRunInput {
  project_id?: number | null;
  model_name: string;
  prompt?: string | null;
  answer?: string | null;
  sources: CitationDetectionSourceInput[];
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
}

export interface ICitationDiagnosisService {
  createPublishedLink(input: PublishedArticleLinkInput, auth: CitationDiagnosisAuth): Promise<any>;
  listPublishedLinks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
  createDetectionRun(input: CitationDetectionRunInput, auth: CitationDiagnosisAuth): Promise<any>;
  listDetectionRuns(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
  listMarks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }>;
}
