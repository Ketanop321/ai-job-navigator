import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, BriefcaseBusiness, Download, LogOut, Plus, Search } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AddApplicationDialog from "@/components/kanban/AddApplicationDialog";
import ApplicationCard from "@/components/kanban/ApplicationCard";
import ApplicationDetailDialog from "@/components/kanban/ApplicationDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/useAuth";
import {
  createApplication,
  deleteApplication,
  getApplications,
  parseJobDescriptionStream,
  updateApplication,
  updateApplicationStatus,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { APPLICATION_STATUSES, type ApplicationPayload, type ApplicationStatus, type JobApplication } from "@/types/application";

const FOLLOW_UP_THRESHOLDS: Partial<Record<ApplicationStatus, number>> = {
  Applied: 5,
  "Phone Screen": 4,
  Interview: 7,
};

const escapeCsvCell = (value: string) => {
  return `"${value.replace(/"/g, '""')}"`;
};

const getOverdueByDays = (application: JobApplication) => {
  const threshold = FOLLOW_UP_THRESHOLDS[application.status];

  if (!threshold) {
    return 0;
  }

  const appliedAt = new Date(application.dateApplied).getTime();
  if (Number.isNaN(appliedAt)) {
    return 0;
  }

  const elapsedDays = Math.floor((Date.now() - appliedAt) / (1000 * 60 * 60 * 24));
  return elapsedDays > threshold ? elapsedDays - threshold : 0;
};

const DashboardPage = () => {
  const { token, user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ApplicationStatus>("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [draggedApplication, setDraggedApplication] = useState<JobApplication | null>(null);

  const applicationsQuery = useQuery({
    queryKey: ["applications", token],
    queryFn: () => getApplications(token as string),
    enabled: Boolean(token),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ApplicationPayload) => createApplication(token as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", token] });
      toast({ title: "Application added", description: "Card created under Applied." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ApplicationPayload> }) =>
      updateApplication(token as string, id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", token] });
      toast({ title: "Application updated" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      updateApplicationStatus(token as string, id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", token] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApplication(token as string, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications", token] });
      toast({ title: "Application deleted" });
    },
  });

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);

  const visibleApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus = statusFilter === "All" || application.status === statusFilter;
      const matchesQuery =
        query.length === 0 ||
        application.company.toLowerCase().includes(query) ||
        application.role.toLowerCase().includes(query) ||
        application.notes.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [applications, searchQuery, statusFilter]);

  const applicationsByStatus = useMemo(() => {
    return APPLICATION_STATUSES.reduce<Record<ApplicationStatus, JobApplication[]>>((accumulator, status) => {
      accumulator[status] = visibleApplications.filter((application) => application.status === status);
      return accumulator;
    }, {
      Applied: [],
      "Phone Screen": [],
      Interview: [],
      Offer: [],
      Rejected: [],
    });
  }, [visibleApplications]);

  const overdueApplications = useMemo(() => {
    return applications
      .map((application) => ({
        ...application,
        overdueByDays: getOverdueByDays(application),
      }))
      .filter((application) => application.overdueByDays > 0)
      .sort((a, b) => b.overdueByDays - a.overdueByDays);
  }, [applications]);

  const overdueApplicationIds = useMemo(() => {
    return new Set(overdueApplications.map((application) => application._id));
  }, [overdueApplications]);

  const handleExportCsv = () => {
    if (applications.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Create at least one application first.",
      });
      return;
    }

    const headers = ["Company", "Role", "Status", "Date Applied", "Salary Range", "JD Link", "Notes"];

    const rows = applications.map((application) => [
      application.company,
      application.role,
      application.status,
      new Date(application.dateApplied).toLocaleDateString(),
      application.salaryRange,
      application.jdLink,
      application.notes,
    ]);

    const csv = [
      headers.map((header) => escapeCsvCell(header)).join(","),
      ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exported",
      description: "Application data downloaded successfully.",
    });
  };

  const handleDrop = async (status: ApplicationStatus) => {
    if (!draggedApplication || draggedApplication.status === status) {
      setDraggedApplication(null);
      return;
    }

    await updateStatusMutation.mutateAsync({
      id: draggedApplication._id,
      status,
    });

    setDraggedApplication(null);
  };

  const interviewCount = applications.filter(
    (application) => application.status === "Phone Screen" || application.status === "Interview",
  ).length;

  const offerCount = applications.filter((application) => application.status === "Offer").length;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-card/90 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Intern Assignment Build</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link to="/" className="transition-colors hover:text-primary">
                AI-Assisted Job Application Tracker
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}. Manage your pipeline and AI-assisted drafting.</p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
            <Button variant="outline" className="gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl">{applications.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>In Screening / Interview</CardDescription>
              <CardTitle className="text-3xl">{interviewCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Offers</CardDescription>
              <CardTitle className="text-3xl">{offerCount}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card className={overdueApplications.length > 0 ? "border-destructive/40" : undefined}>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Follow-up Reminders
            </CardTitle>
            <CardDescription>
              Applications are marked overdue if follow-up is pending beyond threshold days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue follow-ups right now.</p>
            ) : (
              <div className="space-y-2">
                {overdueApplications.slice(0, 6).map((application) => (
                  <div key={application._id} className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-medium">
                      {application.role} at {application.company}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Overdue by {application.overdueByDays} day{application.overdueByDays === 1 ? "" : "s"} in
                      stage {application.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="inline-flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5" />
                  Kanban Board
                </CardTitle>
                <CardDescription>Drag cards between stages as your process moves forward.</CardDescription>
              </div>

              <Badge variant="secondary">Five mandatory assignment stages</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by company, role, notes"
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "All" | ApplicationStatus)}
              >
                <option value="All">All stages</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {applicationsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Loading your application board...
              </div>
            ) : null}

            {applicationsQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                <p>{applicationsQuery.error instanceof Error ? applicationsQuery.error.message : "Failed to load applications."}</p>
                <Button variant="outline" className="mt-3" onClick={() => applicationsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {!applicationsQuery.isLoading && !applicationsQuery.isError ? (
              <div className="grid gap-4 lg:grid-cols-5">
                {APPLICATION_STATUSES.map((status) => (
                  <div
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDrop(status)}
                    className="min-h-[280px] rounded-lg border border-border/70 bg-secondary/40 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{status}</h3>
                      <Badge variant="outline">{applicationsByStatus[status].length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {applicationsByStatus[status].length === 0 ? (
                        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                          No cards
                        </p>
                      ) : (
                        applicationsByStatus[status].map((application) => (
                          <ApplicationCard
                            key={application._id}
                            application={application}
                            onOpenDetails={(selected) => setSelectedApplication(selected)}
                            onDragStart={(dragged) => setDraggedApplication(dragged)}
                            isOverdue={overdueApplicationIds.has(application._id)}
                            overdueByDays={getOverdueByDays(application)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!applicationsQuery.isLoading && !applicationsQuery.isError && applications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">Your board is empty. Click Add Application to create your first card.</p>
                <Button className="mt-4 gap-2" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Application
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AddApplicationDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreate={(payload) => createMutation.mutateAsync(payload)}
        onParseStream={(jobDescription, handlers) =>
          parseJobDescriptionStream(token as string, jobDescription, handlers)
        }
        isSubmitting={createMutation.isPending}
      />

      <ApplicationDetailDialog
        open={Boolean(selectedApplication)}
        application={selectedApplication}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApplication(null);
          }
        }}
        onSave={(id, payload) => updateMutation.mutateAsync({ id, payload })}
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        isSaving={updateMutation.isPending || updateStatusMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};

export default DashboardPage;
