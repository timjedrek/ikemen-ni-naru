import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { ApiError, getCurrentUser, login } from "~/services/api";

const labelClass = "block text-sm font-medium text-slate-700";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

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
      await nav("/food");
      return;
    }
    checking.value = false;
  });

  const submit = $(async () => {
    submitting.value = true;
    error.value = null;
    try {
      await login({ email: form.email, password: form.password });
      await nav("/food");
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
        <p class="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main class="flex min-h-screen items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <Link href="/" class="inline-flex items-center gap-2">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-base font-bold text-white shadow-sm">
              H
            </span>
          </Link>
          <h1 class="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p class="mt-1.5 text-sm text-slate-500">
            Log in to continue to your food log.
          </p>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {error.value && (
            <p
              role="alert"
              class="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
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

        <p class="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link
            href="/register"
            class="font-semibold text-accent-600 hover:text-accent-700"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
});
