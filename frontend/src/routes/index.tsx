import {
  component$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { Logo, LogoStacked } from '~/components/logo/logo';
import { ThemeToggle } from '~/components/theme-toggle/theme-toggle';
import { getCurrentUser, getHealth, type User } from '~/services/api';
import type { HealthResponse } from '~/types/health';

export default component$(() => {
  const health = useSignal<HealthResponse | null>(null);
  const error = useSignal<string | null>(null);
  const loading = useSignal(true);

  // Auth state, so the landing page can swap the login/register prompt for a
  // "logged in as" line once we know there's a session. authChecked gates the
  // swap so the login prompt doesn't flash before the check resolves.
  const user = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    user.value = await getCurrentUser();
    authChecked.value = true;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      health.value = await getHealth();
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error
          ? caughtError.message
          : 'An unknown error occurred';
    } finally {
      loading.value = false;
    }
  });

  return (
    <main class="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div class="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      {/* The horizontal lockup overflows narrow screens, so stack the wordmark
          under the icon on mobile and switch to the wide lockup from sm up. */}
      <LogoStacked class="mb-5 h-auto w-48 self-start sm:hidden" />
      <Logo class="mb-5 hidden h-32 w-auto self-start sm:block" />

      <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Health Tracker
      </h1>
      <p class="mt-4 max-w-lg text-lg text-muted">
        Log your meals, track your macros, and keep an eye on the numbers that
        matter — one day at a time.
      </p>

      <nav class="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          class="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Open dashboard
        </Link>
        {authChecked.value && !user.value && (
          <Link
            href="/login"
            class="inline-flex items-center rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            Log in
          </Link>
        )}
      </nav>

      {authChecked.value &&
        (user.value ? (
          <p class="mt-4 text-sm text-muted">
            You are logged in as{" "}
            <span class="font-medium text-foreground">
              {user.value.display_name || user.value.email}
            </span>
          </p>
        ) : (
          <p class="mt-4 text-sm text-muted">
            Don't have an account?{" "}
            <Link
              href="/register"
              class="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            >
              Create an account
            </Link>
          </p>
        ))}

      <div class="mt-12">
        {loading.value && (
          <div class="flex items-center gap-2 text-sm text-muted">
            <span class="h-2 w-2 animate-pulse rounded-full bg-subtle" />
            Checking the FastAPI backend…
          </div>
        )}

        {error.value && (
          <section class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
              <span class="h-2 w-2 rounded-full bg-red-500" />
              Backend connection failed
            </h2>
            <p class="mt-1 text-sm text-red-700 dark:text-red-400">
              {error.value}
            </p>
          </section>
        )}

        {health.value && (
          <section class="rounded-xl border border-brand-200 bg-surface/70 p-4 shadow-sm backdrop-blur dark:border-brand-500/30">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
              <span class="h-2 w-2 rounded-full bg-brand-500" />
              Backend connection successful
            </h2>
            <p class="mt-1 text-sm text-muted">
              API status:{' '}
              <strong class="font-semibold text-foreground">
                {health.value.status ?? 'Unknown'}
              </strong>
            </p>
            <pre class="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 dark:bg-slate-950 dark:ring-1 dark:ring-white/10">
              {JSON.stringify(health.value, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
});
