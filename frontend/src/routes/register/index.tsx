import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { Logo } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import { ApiError, getCurrentUser, register } from "~/services/api";

// Mirrors the backend MIN_PASSWORD_LENGTH; the server is still the authority.
const MIN_PASSWORD_LENGTH = 8;

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const nav = useNavigate();
  const form = useStore({ email: "", password: "", display_name: "" });
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
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
      await register({
        email: form.email,
        password: form.password,
        display_name: form.display_name.trim() || undefined,
      });
      // Registration auto-logs-in (server sets the session cookie), so go
      // straight to the app.
      await nav("/dashboard");
    } catch (err) {
      error.value =
        err instanceof ApiError ? err.message : "Registration failed. Try again.";
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
            Create your account
          </h1>
          <p class="mt-1.5 text-sm text-muted">
            Start tracking your meals in seconds.
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
                Display name{" "}
                <span class="font-normal text-subtle">(optional)</span>
                <input
                  type="text"
                  autoComplete="name"
                  class={inputClass}
                  value={form.display_name}
                  onInput$={(_, el) => (form.display_name = el.value)}
                />
              </label>
            </div>
            <div>
              <label class={labelClass}>
                Password
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  class={inputClass}
                  value={form.password}
                  onInput$={(_, el) => (form.password = el.value)}
                />
              </label>
              <small class="mt-1.5 block text-xs text-subtle">
                At least {MIN_PASSWORD_LENGTH} characters.
              </small>
            </div>
            <button
              type="submit"
              disabled={submitting.value}
              class="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting.value ? "Creating account…" : "Register"}
            </button>
          </form>
        </div>

        <p class="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            class="font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
});
