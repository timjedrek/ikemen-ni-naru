import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { ApiError, getCurrentUser, register } from "~/services/api";

// Mirrors the backend MIN_PASSWORD_LENGTH; the server is still the authority.
const MIN_PASSWORD_LENGTH = 8;

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
      await nav("/food");
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
      await nav("/food");
    } catch (err) {
      error.value =
        err instanceof ApiError ? err.message : "Registration failed. Try again.";
    } finally {
      submitting.value = false;
    }
  });

  if (checking.value) return <p>Loading...</p>;

  return (
    <main>
      <h1>Create an account</h1>

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
            Display name (optional)
            <input
              type="text"
              autoComplete="name"
              value={form.display_name}
              onInput$={(_, el) => (form.display_name = el.value)}
            />
          </label>
        </p>
        <p>
          <label>
            Password
            <input
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={form.password}
              onInput$={(_, el) => (form.password = el.value)}
            />
          </label>
          <br />
          <small>At least {MIN_PASSWORD_LENGTH} characters.</small>
        </p>
        <p>
          <button type="submit" disabled={submitting.value}>
            {submitting.value ? "Creating account..." : "Register"}
          </button>
        </p>
      </form>

      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
});
