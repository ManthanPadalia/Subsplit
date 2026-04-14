function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 md:px-8 lg:px-12">
        <div className="relative w-full max-w-3xl rounded-lg border border-border bg-card p-6 md:p-8">
          <div className="absolute left-0 right-0 top-0 h-[3px] rounded-t-lg bg-primary" />
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              SubSplit Frontend
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              React, Tailwind, and shadcn setup in place.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Prompt 15 bootstraps the frontend foundation only. Routing, auth,
              pages, and API integration will layer onto this baseline in the
              subsequent prompts.
            </p>
            <div className="grid gap-3 pt-2 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stack
                </p>
                <p className="mt-2 text-sm text-foreground">
                  React 18, Vite, TypeScript
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Styling
                </p>
                <p className="mt-2 text-sm text-foreground">
                  Tailwind v3 tokens + CSS variables
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  UI Base
                </p>
                <p className="mt-2 text-sm text-foreground">
                  shadcn/ui components ready to add
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
