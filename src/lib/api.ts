import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

export async function generateBook(payload: {
  storyInput: string;
  guidedAnswers: Record<string, string>;
  tone: string;
  design: string;
  characters: Array<{ name: string; role: string; imageUrl?: string }>;
}) {
  const { data } = await api.post("/api/generate/book", payload);
  return data;
}

export async function regenerateChapterImage(chapterId: string, prompt: string) {
  const { data } = await api.post("/api/generate/image", { chapterId, prompt });
  return data;
}

export async function uploadImage(file: File): Promise<{ url: string; id: string }> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function createOrder(projectId: string, orderDetails: Record<string, unknown>) {
  const { data } = await api.post("/api/orders", { projectId, ...orderDetails });
  return data;
}

export async function exportPDF(projectId: string): Promise<Blob> {
  const response = await api.get(`/api/export/pdf/${projectId}`, { responseType: "blob" });
  return response.data;
}
