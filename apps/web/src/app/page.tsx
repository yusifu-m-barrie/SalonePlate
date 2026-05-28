export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">SalonePlate</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Order food from your favorite restaurants in Sierra Leone.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Customers order using the SalonePlate mobile app. Restaurant owners and admins manage menus and orders on
            the dashboard.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <a
            className="rounded-xl border bg-card p-5 transition hover:bg-accent"
            href="saloneplate://"
          >
            <div className="text-lg font-medium">Open the mobile app</div>
            <div className="mt-1 text-sm text-muted-foreground">If it’s installed on this device.</div>
          </a>

          <a
            className="rounded-xl border bg-card p-5 transition hover:bg-accent"
            href="/dashboard"
          >
            <div className="text-lg font-medium">Restaurant / Admin dashboard</div>
            <div className="mt-1 text-sm text-muted-foreground">Manage restaurants, menus, orders, and revenue.</div>
          </a>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">Get the app</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your Play Store / App Store links here when you’re ready to publish.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              href="#"
            >
              Android (Play Store)
            </a>
            <a className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent" href="#">
              iPhone (App Store)
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
