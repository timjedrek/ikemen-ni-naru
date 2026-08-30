import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { Logo } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import { ApiError, getCurrentUser, login } from "~/services/api";

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const nav = useNavigate();
  const form = useStore({ email: "", password: "" });
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
  // Until we've checked for an existing session we render nothing, so an
  // already-logged-in user never sees the login form flash before redirect.
  const checking = useSignal(true);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (user) {
      await nav("/dashboard");
      return;
    }
    checking.value = false;
  });

  const submit = $(async () => {
    submitting.value = true;
    error.value = null;
    try {
      await login({ email: form.email, password: form.password });
      await nav("/dashboard");
    } catch (err) {
      error.value =
        err instanceof ApiError ? err.message : "Login failed. Try again.";
    } finally {
      submitting.value = false;
    }
  });

  if (checking.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main class="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div class="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <Link href="/" class="inline-flex items-center" aria-label="Home">
            <Logo class="h-11 w-auto" />
          </Link>
          <h1 class="mt-5 text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p class="mt-1.5 text-sm text-muted">
            Log in to continue to your food log.
          </p>
        </div>

        <div class="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
          {error.value && (
            <p
              role="alert"
              class="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {error.value}
            </p>
          )}

          <form preventdefault:submit onSubmit$={submit} class="space-y-5">
            <div>
              <label class={labelClass}>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  class={inputClass}
                  value={form.email}
                  onInput$={(_, el) => (form.email = el.value)}
                />
              </label>
            </div>
            <div>
              <label class={labelClass}>
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  class={inputClass}
                  value={form.password}
                  onInput$={(_, el) => (form.password = el.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting.value}
              class="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting.value ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p class="mt-6 text-center text-sm text-muted">
          Need an account?{" "}
          <Link
            href="/register"
            class="font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
});
