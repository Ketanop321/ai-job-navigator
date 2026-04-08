import type { AuthResponse, AuthUser } from "@/types/auth";
import type { ApplicationPayload, JobApplication, ParseJdResponse } from "@/types/application";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

interface ApiErrorPayload {
  message?: string;
}

interface ParseStreamHandlers {
  onStatus?: (message: string) => void;
  onSuggestion?: (suggestion: string) => void;
  onParsed?: (parsed: ParseJdResponse["parsed"]) => void;
}

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload.message) {
      return payload.message;
    }
  } catch {
    // Keep fallback message when response body is not valid JSON.
  }

  return `Request failed with status ${response.status}`;
};

const request = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const registerUser = (payload: { name: string; email: string; password: string }) => {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const loginUser = (payload: { email: string; password: string }) => {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getCurrentUser = async (token: string) => {
  const response = await request<{ user: AuthUser }>("/auth/me", { method: "GET" }, token);
  return response.user;
};

export const getApplications = async (token: string) => {
  const response = await request<{ applications: JobApplication[] }>("/applications", { method: "GET" }, token);
  return response.applications;
};

export const createApplication = async (token: string, payload: ApplicationPayload) => {
  const response = await request<{ application: JobApplication }>(
    "/applications",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  return response.application;
};

export const updateApplication = async (
  token: string,
  applicationId: string,
  payload: Partial<ApplicationPayload>,
) => {
  const response = await request<{ application: JobApplication }>(
    `/applications/${applicationId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );

  return response.application;
};

export const updateApplicationStatus = async (
  token: string,
  applicationId: string,
  status: ApplicationPayload["status"],
) => {
  const response = await request<{ application: JobApplication }>(
    `/applications/${applicationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    token,
  );

  return response.application;
};

export const deleteApplication = (token: string, applicationId: string) => {
  return request<void>(`/applications/${applicationId}`, { method: "DELETE" }, token);
};

export const parseJobDescription = (token: string, jobDescription: string) => {
  return request<ParseJdResponse>(
    "/ai/parse-jd",
    {
      method: "POST",
      body: JSON.stringify({ jobDescription }),
    },
    token,
  );
};

export const parseJobDescriptionStream = async (
  token: string,
  jobDescription: string,
  handlers: ParseStreamHandlers = {},
) => {
  const response = await fetch(`${API_BASE_URL}/ai/parse-jd/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jobDescription }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (!response.body) {
    throw new Error("Streaming response is not available in this browser");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  let parsed: ParseJdResponse["parsed"] | null = null;
  const suggestions: string[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let event: unknown;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (!event || typeof event !== "object") {
        continue;
      }

      const payload = event as Record<string, unknown>;
      const type = typeof payload.type === "string" ? payload.type : "";

      if (type === "status" && typeof payload.message === "string") {
        handlers.onStatus?.(payload.message);
      }

      if (type === "parsed" && payload.parsed && typeof payload.parsed === "object") {
        parsed = payload.parsed as ParseJdResponse["parsed"];
        handlers.onParsed?.(parsed);
      }

      if (type === "suggestion" && typeof payload.suggestion === "string") {
        suggestions.push(payload.suggestion);
        handlers.onSuggestion?.(payload.suggestion);
      }

      if (type === "error" && typeof payload.message === "string") {
        throw new Error(payload.message);
      }

      if (type === "done") {
        const doneParsed = payload.parsed;
        const doneSuggestions = payload.suggestions;

        if (doneParsed && typeof doneParsed === "object") {
          parsed = doneParsed as ParseJdResponse["parsed"];
        }

        if (Array.isArray(doneSuggestions)) {
          suggestions.length = 0;
          for (const suggestion of doneSuggestions) {
            if (typeof suggestion === "string") {
              suggestions.push(suggestion);
            }
          }
        }
      }
    }
  }

  if (!parsed || suggestions.length === 0) {
    throw new Error("Streaming parse completed without a valid final payload.");
  }

  return {
    parsed,
    suggestions,
  } satisfies ParseJdResponse;
};
