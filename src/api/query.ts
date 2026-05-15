import { api } from "./client";

export interface QueryRequest {
  question: string;
  category?: string;
}

export interface QueryResponse {
  answer: string;
  was_fallback: boolean;
  latency_ms: number;
}

export async function askBot(req: QueryRequest): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>("/query", req);
  return data;
}
