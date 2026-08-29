import {
  component$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { getHealth } from '~/services/api';
import type { HealthResponse } from '~/types/health';

export default component$(() => {
  const health = useSignal<HealthResponse | null>(null);
  const error = useSignal<string | null>(null);
  const loading = useSignal(true);

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
    <main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div class="mb-3 flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white shadow-sm">
          H
        </span>
        <span class="text-sm font-medium uppercase tracking-widest text-accent-600">
          Ikemen ni Naru
        </span>
      </div>

      <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Health Tracker
      </h1>
      <p class="mt-4 max-w-lg text-lg text-slate-500">
        Log your meals, track your macros, and keep an eye on the numbers that
        matter — one day at a time.
      </p>

      <nav class="mt-8 flex flex-wrap gap-3">
        <Link
          href="/food"
          class="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Open food log
        </Link>
        <Link
          href="/login"
          class="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Log in
        </Link>
        <Link
          href="/register"
          class="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
        >
          Create account
        </Link>
      </nav>

      <div class="mt-12">
        {loading.value && (
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
            Checking the FastAPI backend…
          </div>
        )}

        {error.value && (
          <section class="rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-red-800">
              <span class="h-2 w-2 rounded-full bg-red-500" />
              Backend connection failed
            </h2>
            <p class="mt-1 text-sm text-red-700">{error.value}</p>
          </section>
        )}

        {health.value && (
          <section class="rounded-xl border border-brand-200 bg-white/70 p-4 shadow-sm backdrop-blur">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <span class="h-2 w-2 rounded-full bg-brand-500" />
              Backend connection successful
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              API status:{' '}
              <strong class="font-semibold text-slate-900">
                {health.value.status ?? 'Unknown'}
              </strong>
            </p>
            <pre class="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(health.value, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
});
