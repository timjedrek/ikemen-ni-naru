import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { ApiError, getCurrentUser, login } from "~/services/api";

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

  if (checking.value) return <p>Loading...</p>;

  return (
    <main>
      <h1>Log in</h1>

      {error.value && <p role="alert">{error.value}</p>}

      <form preventdefault:submit onSubmit$={submit}>
        <p>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onInput$={(_, el) => (form.email = el.value)}
            />
          </label>
        </p>
        <p>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onInput$={(_, el) => (form.password = el.value)}
            />
          </label>
        </p>
        <p>
          <button type="submit" disabled={submitting.value}>
            {submitting.value ? "Logging in..." : "Log in"}
          </button>
        </p>
      </form>

      <p>
        Need an account? <Link href="/register">Register</Link>
      </p>
    </main>
  );
});
