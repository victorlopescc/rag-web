import { api } from "./client";

export type EscalationStatus =
  | "pending"
  | "coordinator_replied"
  | "resolved_by_bot_later"
  | "live"
  | "resolved"
  | "abandoned";

export type CoordinatorLabel =
  | "bot_was_wrong"
  | "missing_document"
  | "student_misunderstood"
  | "other";

export interface StudentLite {
  id: string;
  full_name: string;
  matricula: string;
  phone_number: string;
}

export interface EscalationListItem {
  id: string;
  status: EscalationStatus;
  summary: string;
  student: StudentLite;
  session_id: string;
  created_at: string;
  replied_at: string | null;
  coordinator_label: CoordinatorLabel | null;
}

export interface AttemptOut {
  attempt_number: number;
  question: string;
  answer: string;
  retrieval_strategy: string;
  was_fallback: boolean;
  feedback_signal: string | null;
  created_at: string;
}

export interface EscalationDetail extends EscalationListItem {
  coordinator_reply: string | null;
  coordinator_notes: string | null;
  closing_feedback: string | null;
  attempts: AttemptOut[];
  live_opened_at: string | null;
  live_closed_at: string | null;
  last_activity_at: string | null;
}

export type ThreadDirection = "student" | "coordinator";

export interface ThreadMessageOut {
  id: string;
  direction: ThreadDirection;
  text: string;
  sent_at: string;
}

export interface ThreadView {
  escalation_id: string;
  status: EscalationStatus;
  live_opened_at: string | null;
  live_closed_at: string | null;
  last_activity_at: string | null;
  messages: ThreadMessageOut[];
}

export interface EscalationPatch {
  status?: EscalationStatus;
  coordinator_label?: CoordinatorLabel;
  coordinator_notes?: string;
  coordinator_reply?: string;
}

export interface EscalationReplyPayload {
  message: string;
  coordinator_label?: CoordinatorLabel;
  coordinator_notes?: string;
}

export async function listEscalations(
  status?: EscalationStatus,
): Promise<EscalationListItem[]> {
  const { data } = await api.get<EscalationListItem[]>("/admin/escalations", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function getEscalation(id: string): Promise<EscalationDetail> {
  const { data } = await api.get<EscalationDetail>(`/admin/escalations/${id}`);
  return data;
}

export async function patchEscalation(
  id: string,
  patch: EscalationPatch,
): Promise<EscalationDetail> {
  const { data } = await api.patch<EscalationDetail>(
    `/admin/escalations/${id}`,
    patch,
  );
  return data;
}

export async function replyEscalation(
  id: string,
  payload: EscalationReplyPayload,
): Promise<EscalationDetail> {
  const { data } = await api.post<EscalationDetail>(
    `/admin/escalations/${id}/reply`,
    payload,
  );
  return data;
}

export async function closeStaleSessions(): Promise<{ closed: number }> {
  const { data } = await api.post<{ closed: number }>(
    "/admin/maintenance/close-stale",
  );
  return data;
}


// --- Live thread ----------------------------------------------------------

export async function getThread(id: string): Promise<ThreadView> {
  const { data } = await api.get<ThreadView>(
    `/admin/escalations/${id}/thread`,
  );
  return data;
}

export async function startThread(id: string): Promise<EscalationDetail> {
  const { data } = await api.post<EscalationDetail>(
    `/admin/escalations/${id}/thread/start`,
  );
  return data;
}

export async function sendThreadMessage(
  id: string,
  text: string,
): Promise<ThreadMessageOut> {
  const { data } = await api.post<ThreadMessageOut>(
    `/admin/escalations/${id}/thread/messages`,
    { text },
  );
  return data;
}

export async function closeThread(id: string): Promise<EscalationDetail> {
  const { data } = await api.post<EscalationDetail>(
    `/admin/escalations/${id}/thread/close`,
  );
  return data;
}
