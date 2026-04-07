import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex items-center justify-between rounded-xl border border-border/60 bg-card/90 p-4">
          <div className="inline-flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">AI Job Application Tracker</p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link to={user ? "/app" : "/auth"}>{user ? "Open App" : "Login"}</Link>
            </Button>
          </div>
        </header>

        <section className="rounded-xl border border-border/60 bg-card/90 p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Internship Assignment Build</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Track applications on a Kanban board with AI-assisted parsing.
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Register, parse job descriptions, generate resume bullets, drag cards through interview stages, and manage
            your full pipeline with a production-style full-stack setup.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={user ? "/app" : "/auth"}>
                {user ? "Go to Dashboard" : "Get Started"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {!user ? (
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Login / Register</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Parse</CardTitle>
              <CardDescription>Groq-powered extraction of role, skills, seniority, and location.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kanban Workflow</CardTitle>
              <CardDescription>Applied, Phone Screen, Interview, Offer, Rejected with drag and drop.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Resume Suggestions
              </CardTitle>
              <CardDescription>Role-specific bullet points with one-click copy support.</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Index;
