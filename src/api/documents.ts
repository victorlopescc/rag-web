import { api } from "./client";

export interface DocumentOut {
  id: string;
  filename: string;
  file_type: string;
  category: string | null;
  description: string | null;
  file_size: number | null;
  total_chunks: number;
  status: "pending" | "processing" | "indexed" | "error";
  error_msg: string | null;
  created_at: string;
}

export interface CategorySuggestion {
  suggested_category: string | null;
  available_categories: string[];
}

export interface ChunkPreview {
  chunk_index: number;
  content: string;
  char_count: number;
  token_count: number | null;
}

export interface ChunksPage {
  document_id: string;
  filename: string;
  total_chunks: number;
  offset: number;
  limit: number;
  chunks: ChunkPreview[];
}

export async function listDocuments(): Promise<DocumentOut[]> {
  const { data } = await api.get<DocumentOut[]>("/documents");
  return data;
}

export async function uploadDocument(
  file: File,
  category?: string,
  description?: string,
): Promise<DocumentOut> {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  if (description) form.append("description", description);

  const { data } = await api.post<DocumentOut>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 5 * 60_000, // ingestão pode demorar (embeddings via Ollama)
  });
  return data;
}

export async function suggestCategory(file: File): Promise<CategorySuggestion> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<CategorySuggestion>(
    "/documents/suggest-category",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30_000,
    },
  );
  return data;
}

export async function getDocumentChunks(
  id: string,
  offset = 0,
  limit = 20,
): Promise<ChunksPage> {
  const { data } = await api.get<ChunksPage>(`/documents/${id}/chunks`, {
    params: { offset, limit },
  });
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}
