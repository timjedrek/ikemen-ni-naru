import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { AppHeader } from "~/components/app-header/app-header";
import { DayFeed } from "~/components/day-feed/day-feed";
import { getCurrentUser, type User } from "~/services/api";

// "2026-08-29" → "Saturday, Aug 29, 2026". Parsed as local midnight so the
// weekday/label match the day the user drilled into.
function formatDayHeading(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default component$(() => {
  const nav = useNavigate();
  // Reactive: the date lives in the URL, and the nav date-picker can change it
  // while staying on this same route, so we track it rather than reading once.
  const loc = useLocation();

  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  // Auth gate (once): redirect out if there's no session.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    authChecked.value = true;
  });

  if (!authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <div class="min-h-screen">
      <AppHeader user={authUser.value} />

      <main class="mx-auto max-w-4xl px-6 py-8">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              ← Back to home
            </Link>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {formatDayHeading(loc.params.date)}
            </h1>
          </div>
        </div>

        <DayFeed date={loc.params.date} />
      </main>
    </div>
  );
});
