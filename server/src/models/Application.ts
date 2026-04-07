import { Schema, model, type Document, type Types } from "mongoose";
import { applicationStatuses, type ApplicationStatus, type ParsedJobDetails } from "../types/application";

export interface ApplicationDocument extends Document {
  userId: Types.ObjectId;
  company: string;
  role: string;
  jdLink: string;
  notes: string;
  dateApplied: Date;
  status: ApplicationStatus;
  salaryRange: string;
  jobDescription: string;
  parsedDetails: ParsedJobDetails;
  resumeSuggestions: string[];
}

const applicationSchema = new Schema<ApplicationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    jdLink: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    dateApplied: { type: Date, required: true, default: () => new Date() },
    status: {
      type: String,
      enum: applicationStatuses,
      default: "Applied",
      required: true,
    },
    salaryRange: { type: String, default: "", trim: true },
    jobDescription: { type: String, default: "", trim: true },
    parsedDetails: {
      companyName: { type: String, default: "" },
      role: { type: String, default: "" },
      requiredSkills: { type: [String], default: [] },
      niceToHaveSkills: { type: [String], default: [] },
      seniority: { type: String, default: "" },
      location: { type: String, default: "" },
    },
    resumeSuggestions: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const ApplicationModel = model<ApplicationDocument>("Application", applicationSchema);
