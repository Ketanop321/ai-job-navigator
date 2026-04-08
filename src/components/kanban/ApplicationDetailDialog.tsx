import { useEffect, useState } from "react";
import { ClipboardCopy, Trash2 } from "lucide-react";
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
import { APPLICATION_STATUSES, type ApplicationPayload, type JobApplication } from "@/types/application";

interface ApplicationDetailDialogProps {
  open: boolean;
  application: JobApplication | null;
  onOpenChange: (open: boolean) => void;
  onSave: (applicationId: string, payload: Partial<ApplicationPayload>) => Promise<unknown>;
  onDelete: (applicationId: string) => Promise<unknown>;
  isSaving: boolean;
  isDeleting: boolean;
}

const ApplicationDetailDialog = ({
  open,
  application,
  onOpenChange,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: ApplicationDetailDialogProps) => {
  const [draft, setDraft] = useState<ApplicationPayload | null>(null);

  useEffect(() => {
    if (!application) {
      setDraft(null);
      return;
    }

    setDraft({
      company: application.company,
      role: application.role,
      jdLink: application.jdLink,
      notes: application.notes,
      dateApplied: new Date(application.dateApplied).toISOString().slice(0, 10),
      status: application.status,
      salaryRange: application.salaryRange,
      jobDescription: application.jobDescription,
      parsedDetails: application.parsedDetails,
      resumeSuggestions: application.resumeSuggestions,
    });
  }, [application]);

  if (!application || !draft) {
    return null;
  }

  const updateField = (field: keyof ApplicationPayload, value: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const copySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Suggestion copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard was not available." });
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const dateApplied = draft.dateApplied
      ? new Date(`${draft.dateApplied}T00:00:00.000Z`).toISOString()
      : new Date().toISOString();

    await onSave(application._id, {
      ...draft,
      dateApplied,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this application? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    await onDelete(application._id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
          <DialogDescription>View, edit, and manage this job application card.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Input value={draft.company} onChange={(event) => updateField("company", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input value={draft.role} onChange={(event) => updateField("role", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Applied</label>
              <Input
                type="date"
                value={draft.dateApplied}
                onChange={(event) => updateField("dateApplied", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, status: event.target.value as ApplicationPayload["status"] } : null))
                }
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">JD Link</label>
              <Input value={draft.jdLink} onChange={(event) => updateField("jdLink", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Salary Range</label>
              <Input
                value={draft.salaryRange}
                onChange={(event) => updateField("salaryRange", event.target.value)}
                placeholder="e.g. 10-15 LPA"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </div>
          </div>

          {draft.resumeSuggestions.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">Resume Suggestions</p>
              {draft.resumeSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start justify-between gap-2 rounded bg-secondary/50 p-2">
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
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationDetailDialog;
