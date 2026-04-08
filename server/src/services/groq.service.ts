import { z } from "zod";
import { env } from "../config/env";
import type { ParsedJobDetails } from "../types/application";
import { ApiError } from "../utils/http";

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const parsedJdSchema = z.object({
  companyName: z.string().min(1),
  role: z.string().min(1),
  requiredSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  seniority: z.string().min(1),
  location: z.string().min(1),
});

const suggestionContainerSchema = z.object({
  suggestions: z.array(z.unknown()).optional(),
  bullets: z.array(z.unknown()).optional(),
  bulletPoints: z.array(z.unknown()).optional(),
  resumeSuggestions: z.array(z.unknown()).optional(),
});

const extractSuggestionText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Record<string, unknown>;
    const preferredKeys = ["text", "bullet", "suggestion", "content", "value", "point"];

    for (const key of preferredKeys) {
      const raw = candidate[key];
      if (typeof raw === "string") {
        const cleaned = raw.trim();
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }

    for (const raw of Object.values(candidate)) {
      if (typeof raw === "string") {
        const cleaned = raw.trim();
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  }

  return null;
};

const normalizeSuggestions = (payload: unknown) => {
  const container = suggestionContainerSchema.parse(payload);
  const rawSuggestions =
    container.suggestions ?? container.bullets ?? container.bulletPoints ?? container.resumeSuggestions ?? [];

  const normalized = rawSuggestions
    .map((item) => extractSuggestionText(item))
    .filter((item): item is string => Boolean(item));

  const deduped = Array.from(new Set(normalized));

  if (deduped.length < 3) {
    throw new ApiError(
      502,
      "AI returned an unexpected suggestions format. Please retry parsing the job description.",
    );
  }

  return deduped.slice(0, 5);
};

const callGroqJson = async (systemPrompt: string, userPrompt: string) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(502, "Groq API request failed", errorText);
  }

  const payload = (await response.json()) as GroqChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new ApiError(502, "Groq API returned empty content");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new ApiError(502, "Groq API did not return valid JSON");
  }
};

export const parseJobDescription = async (jobDescription: string): Promise<ParsedJobDetails> => {
  const systemPrompt =
    "You are an expert recruiter. Extract structured data from job descriptions. Return only valid JSON.";

  const userPrompt = [
    "Extract these fields from the job description:",
    "companyName (string)",
    "role (string)",
    "requiredSkills (string[])",
    "niceToHaveSkills (string[])",
    "seniority (string)",
    "location (string)",
    "If missing, infer concise sensible defaults.",
    "Job description:",
    jobDescription,
  ].join("\n");

  const json = await callGroqJson(systemPrompt, userPrompt);
  return parsedJdSchema.parse(json);
};

export const generateResumeSuggestions = async (
  details: ParsedJobDetails,
  jobDescription: string,
): Promise<string[]> => {
  const systemPrompt =
    "You are a senior career coach. Return highly specific, quantified resume bullets tailored to a role. Return only JSON.";

  const userPrompt = [
    "Generate 3 to 5 resume bullet suggestions for the candidate.",
    "Do not use generic filler.",
    "Return format: { \"suggestions\": [\"...\"] }",
    `Role: ${details.role}`,
    `Company: ${details.companyName}`,
    `Seniority: ${details.seniority}`,
    `Location: ${details.location}`,
    `Required Skills: ${details.requiredSkills.join(", ") || "Not specified"}`,
    `Nice To Have Skills: ${details.niceToHaveSkills.join(", ") || "Not specified"}`,
    "Job description:",
    jobDescription,
  ].join("\n");

  const json = await callGroqJson(systemPrompt, userPrompt);
  return normalizeSuggestions(json);
};
