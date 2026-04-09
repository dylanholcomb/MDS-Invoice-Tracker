const API = "/api";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ id: number; username: string; displayName: string; role: string }>(
      "POST", "/auth/login", { username, password }
    ),
  logout: () => request("POST", "/auth/logout"),
  me: () => request<{ id: number; username: string; displayName: string; role: string; linkedSupplierId?: string }>("GET", "/vendor/me"),

  listSubmissions: () => request<Submission[]>("GET", "/vendor/submissions"),
  getSubmission: (id: number) => request<Submission>("GET", `/vendor/submissions/${id}`),
  createSubmission: (data: SubmitPayload) => request<Submission>("POST", "/vendor/submissions", data),

  getUploadUrl: (filename: string, contentType?: string) =>
    request<{ uploadUrl: string; objectPath: string }>("POST", "/storage/upload-url", { filename, contentType }),
  getDownloadUrl: (objectPath: string) =>
    request<{ downloadUrl: string }>("POST", "/storage/download-url", { objectPath }),
};

export interface Submission {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  submissionReference?: string | null;
  status: string;
  contractNumber?: string | null;
  poNumber?: string | null;
  description?: string | null;
  createdAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: number;
  filename: string;
  contentType?: string | null;
  fileSize?: number | null;
  objectPath?: string;
  uploadedAt: string;
}

export interface SubmitPayload {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  contractNumber?: string;
  poNumber?: string;
  description?: string;
  attachmentPaths?: string[];
}
