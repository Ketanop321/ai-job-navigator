import { useEffect, useState } from "react";
import { Loader2, Sparkles, ClipboardCopy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { ApplicationPayload, ParseJdResponse } from "@/types/application";

interface AddApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: ApplicationPayload) => Promise<unknown>;
  onParseStream: (
    jobDescription: string,
    handlers: {
      onStatus?: (message: string) => void;
      onSuggestion?: (suggestion: string) => void;
      onParsed?: (parsed: ParseJdResponse["parsed"]) => void;
    },
  ) => Promise<ParseJdResponse>;
  isSubmitting: boolean;
}

const emptyPayload = (): ApplicationPayload => ({
  company: "",
  role: "",
  jdLink: "",
  notes: "",
  dateApplied: new Date().toISOString().slice(0, 10),
  status: "Applied",
  salaryRange: "",
  jobDescription: "",
  parsedDetails: {
    companyName: "",
    role: "",
    requiredSkills: [],
    niceToHaveSkills: [],
    seniority: "",
    location: "",
  },
  resumeSuggestions: [],
});

const AddApplicationDialog = ({
  open,
  onOpenChange,
  onCreate,
  onParseStream,
  isSubmitting,
}: AddApplicationDialogProps) => {
  const [draft, setDraft] = useState<ApplicationPayload>(emptyPayload());
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(emptyPayload());
      setJobDescriptionInput("");
      setParseError(null);
      setIsParsing(false);
      setParseStatus(null);
    }
  }, [open]);

  const handleFieldChange = (field: keyof ApplicationPayload, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleParse = async () => {
    const text = jobDescriptionInput.trim();

    if (text.length < 80) {
      setParseError("Please paste at least 80 characters of job description before parsing.");
      return;
    }

    setParseError(null);
    setIsParsing(true);
    setParseStatus("Starting stream...");

    setDraft((current) => ({
      ...current,
      resumeSuggestions: [],
      parsedDetails: {
        companyName: "",
        role: "",
        requiredSkills: [],
        niceToHaveSkills: [],
        seniority: "",
        location: "",
      },
    }));

    try {
      const response = await onParseStream(text, {
        onStatus: (message) => {
          setParseStatus(message);
        },
        onParsed: (parsed) => {
          setDraft((current) => ({
            ...current,
            company: parsed.companyName || current.company,
            role: parsed.role || current.role,
            parsedDetails: parsed,
          }));
        },
        onSuggestion: (suggestion) => {
          setDraft((current) => {
            if (current.resumeSuggestions.includes(suggestion)) {
              return current;
            }

            return {
              ...current,
              resumeSuggestions: [...current.resumeSuggestions, suggestion],
            };
          });
        },
      });

      setDraft((current) => ({
        ...current,
        company: response.parsed.companyName || current.company,
        role: response.parsed.role || current.role,
        notes:
          current.notes ||
          `Required: ${response.parsed.requiredSkills.join(", ") || "Not specified"}\nNice-to-have: ${response.parsed.niceToHaveSkills.join(", ") || "Not specified"}`,
        jobDescription: text,
        parsedDetails: response.parsed,
        resumeSuggestions: response.suggestions,
      }));

      setParseStatus("Streaming complete.");

      toast({
        title: "Job description parsed",
        description: "Fields and tailored resume bullets were generated.",
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse job description");
      setParseStatus(null);
    } finally {
      setIsParsing(false);
    }
  };

  const copySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Suggestion copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard in this browser." });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.company.trim() || !draft.role.trim()) {
      setParseError("Company and role are required.");
      return;
    }

    const dateApplied = draft.dateApplied
      ? new Date(`${draft.dateApplied}T00:00:00.000Z`).toISOString()
      : new Date().toISOString();

    await onCreate({
      ...draft,
      status: "Applied",
      dateApplied,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>
            Paste a job description, parse with AI, review suggestions, then save to your board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <label className="text-sm font-medium">Job Description</label>
            <Textarea
              value={jobDescriptionInput}
              onChange={(event) => setJobDescriptionInput(event.target.value)}
              placeholder="Paste full JD here to auto-fill fields..."
              className="min-h-[140px]"
            />
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleParse} disabled={isParsing} className="gap-2">
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Parse with Groq
              </Button>
              <p className="text-xs text-muted-foreground">Status defaults to Applied when saved.</p>
            </div>
            {parseStatus ? <p className="text-xs text-muted-foreground">{parseStatus}</p> : null}
            {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Input
                value={draft.company}
                onChange={(event) => handleFieldChange("company", event.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                value={draft.role}
                onChange={(event) => handleFieldChange("role", event.target.value)}
                placeholder="Job title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Applied</label>
              <Input
                type="date"
                value={draft.dateApplied}
                onChange={(event) => handleFieldChange("dateApplied", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Salary Range (optional)</label>
              <Input
                value={draft.salaryRange}
                onChange={(event) => handleFieldChange("salaryRange", event.target.value)}
                placeholder="e.g. 10-15 LPA"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">JD Link</label>
              <Input
                value={draft.jdLink}
                onChange={(event) => handleFieldChange("jdLink", event.target.value)}
                placeholder="https://company.com/careers/..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={draft.notes}
                onChange={(event) => handleFieldChange("notes", event.target.value)}
                placeholder="Interview prep notes, referral details, etc."
              />
            </div>
          </div>

          {draft.parsedDetails.requiredSkills.length > 0 || draft.parsedDetails.niceToHaveSkills.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">AI Extracted Skills</p>
              <div className="flex flex-wrap gap-2">
                {draft.parsedDetails.requiredSkills.map((skill) => (
                  <Badge key={`required-${skill}`} variant="secondary">
                    {skill}
                  </Badge>
                ))}
                {draft.parsedDetails.niceToHaveSkills.map((skill) => (
                  <Badge key={`nice-${skill}`} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {draft.resumeSuggestions.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">Tailored Resume Suggestions</p>
              <div className="space-y-2">
                {draft.resumeSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start justify-between gap-3 rounded-md bg-secondary/50 p-2">
                    <p className="text-sm">{suggestion}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copySuggestion(suggestion)}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isParsing}>
              {isSubmitting ? "Saving..." : "Save Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddApplicationDialog;
