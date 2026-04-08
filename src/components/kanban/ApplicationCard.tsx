import { CalendarDays, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobApplication } from "@/types/application";

interface ApplicationCardProps {
  application: JobApplication;
  onOpenDetails: (application: JobApplication) => void;
  onDragStart: (application: JobApplication) => void;
  isOverdue?: boolean;
  overdueByDays?: number;
}

const ApplicationCard = ({ application, onOpenDetails, onDragStart, isOverdue = false, overdueByDays = 0 }: ApplicationCardProps) => {
  return (
    <button
      type="button"
      draggable
      onDragStart={() => onDragStart(application)}
      onClick={() => onOpenDetails(application)}
      className={`w-full rounded-lg border bg-card p-3 text-left transition hover:border-primary/50 hover:shadow-sm ${
        isOverdue ? "border-destructive/60 bg-destructive/5" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{application.role}</p>
          <p className="text-sm text-muted-foreground">{application.company}</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{application.status}</Badge>
        {application.salaryRange ? <Badge variant="secondary">{application.salaryRange}</Badge> : null}
        {isOverdue ? <Badge variant="destructive">Overdue {overdueByDays}d</Badge> : null}
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="h-3 w-3" />
        <span>{new Date(application.dateApplied).toLocaleDateString()}</span>
      </div>
    </button>
  );
};

export default ApplicationCard;
