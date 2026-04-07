export const APPLICATION_STATUSES = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ParsedJobDetails {
  companyName: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string;
  location: string;
}

export interface JobApplication {
  _id: string;
  userId: string;
  company: string;
  role: string;
  jdLink: string;
  notes: string;
  dateApplied: string;
  status: ApplicationStatus;
  salaryRange: string;
  jobDescription: string;
  parsedDetails: ParsedJobDetails;
  resumeSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationPayload {
  company: string;
  role: string;
  jdLink: string;
  notes: string;
  dateApplied: string;
  status: ApplicationStatus;
  salaryRange: string;
  jobDescription: string;
  parsedDetails: ParsedJobDetails;
  resumeSuggestions: string[];
}

export interface ParseJdResponse {
  parsed: ParsedJobDetails;
  suggestions: string[];
}
