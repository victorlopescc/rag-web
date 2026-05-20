import { api } from "./client";

export interface OverviewKPIs {
  window_start: string;
  window_end: string;

  total_sessions: number;
  sessions_resolved: number;
  sessions_escalated: number;
  sessions_abandoned: number;
  sessions_open: number;

  resolution_rate: number;
  escalation_rate: number;

  total_attempts: number;
  fallback_attempts: number;
  fallback_rate: number;

  avg_latency_ms: number | null;
  p95_latency_ms: number | null;

  total_escalations: number;
  pending_escalations: number;
  avg_reply_minutes: number | null;
  median_reply_minutes: number | null;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ReplyBucket {
  bucket: string;
  count: number;
}

export interface ClosingFeedbackCount {
  feedback: string;
  count: number;
}

export interface EscalationsReport {
  total: number;
  by_label: LabelCount[];
  by_status: StatusCount[];
  reply_time_buckets: ReplyBucket[];
  closing_feedback: ClosingFeedbackCount[];
}

export interface DocumentRow {
  document_id: string | null;
  filename: string;
  category: string | null;
  status: string;
  attempts_used: number;
  fallback_attempts: number;
  fallback_rate: number;
  avg_score: number | null;
}

export interface DocumentsReport {
  rows: DocumentRow[];
  never_retrieved: DocumentRow[];
}

export interface TimeSeriesPoint {
  date: string;
  sessions_opened: number;
  sessions_resolved: number;
  sessions_escalated: number;
  attempts: number;
  fallback_attempts: number;
}

export interface TimeSeriesReport {
  points: TimeSeriesPoint[];
}

export interface TopicCategoryRow {
  category: string;
  attempts: number;
  fallback_attempts: number;
  fallback_rate: number;
  escalations: number;
}

export interface TopicTerm {
  term: string;
  count: number;
  category: string | null;
}

export interface TopicsReport {
  by_category: TopicCategoryRow[];
  top_terms: TopicTerm[];
  total_attempts: number;
}

export type ExportSection =
  | "overview"
  | "escalations"
  | "documents"
  | "timeseries"
  | "topics";

export interface Range {
  since?: string;
  until?: string;
}

function params(range?: Range) {
  if (!range) return undefined;
  const p: Record<string, string> = {};
  if (range.since) p.since = range.since;
  if (range.until) p.until = range.until;
  return p;
}

export async function getOverview(range?: Range): Promise<OverviewKPIs> {
  const { data } = await api.get<OverviewKPIs>(
    "/admin/analytics/overview",
    { params: params(range) },
  );
  return data;
}

export async function getEscalationsReport(
  range?: Range,
): Promise<EscalationsReport> {
  const { data } = await api.get<EscalationsReport>(
    "/admin/analytics/escalations",
    { params: params(range) },
  );
  return data;
}

export async function getDocumentsReport(
  range?: Range,
): Promise<DocumentsReport> {
  const { data } = await api.get<DocumentsReport>(
    "/admin/analytics/documents",
    { params: params(range) },
  );
  return data;
}

export async function getTimeSeries(range?: Range): Promise<TimeSeriesReport> {
  const { data } = await api.get<TimeSeriesReport>(
    "/admin/analytics/timeseries",
    { params: params(range) },
  );
  return data;
}

export async function getTopics(
  range?: Range,
  topN = 25,
): Promise<TopicsReport> {
  const p = { ...(params(range) || {}), top_n: String(topN) };
  const { data } = await api.get<TopicsReport>(
    "/admin/analytics/topics",
    { params: p },
  );
  return data;
}

/** Returns a URL string (with API key in header) for the CSV download.
 * We just trigger a download via fetch + blob to keep the X-API-Key header. */
export async function downloadCsv(
  section: ExportSection,
  range?: Range,
): Promise<void> {
  const res = await api.get<Blob>(
    `/admin/analytics/export/${section}.csv`,
    { params: params(range), responseType: "blob" },
  );
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${section}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
