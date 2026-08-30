import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AppHeader } from "~/components/app-header/app-header";
import {
  ApiError,
  changePassword,
  getCurrentUser,
  updateProfile,
  type User,
} from "~/services/api";

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";
const alertBase = "mt-4 rounded-lg px-3.5 py-2.5 text-sm";
const errorClass = `${alertBase} border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300`;
const okClass = `${alertBase} border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300`;
const submitClass =
  "flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

// Same minimum enforced by the backend (app/core/security.py).
const MIN_PASSWORD_LENGTH = 8;

// Normalize an email the way the backend does, so "changed?" comparisons match.
function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

type ProfileForm = { display_name: string; email: string; current_password: string };
type PasswordForm = { current_password: string; new_password: string; confirm: string };

export default component$(() => {
  const nav = useNavigate();
  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  const profile = useStore<ProfileForm>({
    display_name: "",
    email: "",
    current_password: "",
  });
  const profileSaving = useSignal(false);
  const profileError = useSignal<string | null>(null);
  const profileOk = useSignal<string | null>(null);

  const password = useStore<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const passwordSaving = useSignal(false);
  const passwordError = useSignal<string | null>(null);
  const passwordOk = useSignal<string | null>(null);

  // Seed the profile form from the loaded user (and re-seed after a save).
  const seedProfile = $((user: User) => {
    profile.display_name = user.display_name ?? "";
    profile.email = user.email;
    profile.current_password = "";
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    await seedProfile(user);
    authChecked.value = true;
  });

  const saveProfile = $(async () => {
    profileError.value = null;
    profileOk.value = null;
    const user = authUser.value;
    if (!user) return;

    const nameChanged = profile.display_name.trim() !== (user.display_name ?? "");
    const emailChanged = normEmail(profile.email) !== user.email;

    const payload: {
      display_name?: string | null;
      email?: string;
      current_password?: string;
    } = {};
    if (nameChanged) payload.display_name = profile.display_name.trim() || null;
    if (emailChanged) {
      if (!profile.current_password) {
        profileError.value = "Enter your current password to change your email.";
        return;
      }
      payload.email = profile.email.trim();
      payload.current_password = profile.current_password;
    }

    if (Object.keys(payload).length === 0) {
      profileError.value = "Nothing to save — make a change first.";
      return;
    }

    profileSaving.value = true;
    try {
      const updated = await updateProfile(payload);
      authUser.value = updated;
      await seedProfile(updated);
      profileOk.value = "Profile updated.";
    } catch (err) {
      profileError.value =
        err instanceof ApiError ? err.message : "Something went wrong. Try again.";
    } finally {
      profileSaving.value = false;
    }
  });

  const savePassword = $(async () => {
    passwordError.value = null;
    passwordOk.value = null;

    if (password.new_password.length < MIN_PASSWORD_LENGTH) {
      passwordError.value = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      return;
    }
    if (password.new_password !== password.confirm) {
      passwordError.value = "New password and confirmation don't match.";
      return;
    }

    passwordSaving.value = true;
    try {
      await changePassword({
        current_password: password.current_password,
        new_password: password.new_password,
      });
      password.current_password = "";
      password.new_password = "";
      password.confirm = "";
      passwordOk.value =
        "Password changed. Any other signed-in sessions have been logged out.";
    } catch (err) {
      passwordError.value =
        err instanceof ApiError ? err.message : "Something went wrong. Try again.";
    } finally {
      passwordSaving.value = false;
    }
  });

  const emailChanged =
    authUser.value !== null && normEmail(profile.email) !== authUser.value.email;

  if (!authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <div class="min-h-screen">
      <AppHeader user={authUser.value} width="max-w-3xl" />

      <main class="mx-auto max-w-3xl px-6 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Account</h1>
          <p class="mt-0.5 text-sm text-muted">
            Manage your profile and password.
          </p>
        </div>

        <div class="space-y-8">
          {/* Profile */}
          <section
            aria-labelledby="profile-heading"
            class="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line"
          >
            <h2
              id="profile-heading"
              class="text-lg font-semibold tracking-tight text-foreground"
            >
              Profile
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Your display name and email. Changing your email needs your current
              password.
            </p>

            {profileError.value && (
              <p role="alert" class={errorClass}>
                {profileError.value}
              </p>
            )}
            {profileOk.value && (
              <p role="status" class={okClass}>
                {profileOk.value}
              </p>
            )}

            <form preventdefault:submit onSubmit$={saveProfile} class="mt-5 space-y-4">
              <div>
                <label class={labelClass}>
                  Display name <span class="font-normal text-subtle">(optional)</span>
                  <input
                    type="text"
                    maxLength={100}
                    class={inputClass}
                    value={profile.display_name}
                    onInput$={(_, el) => (profile.display_name = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Email
                  <input
                    type="email"
                    required
                    class={inputClass}
                    value={profile.email}
                    onInput$={(_, el) => (profile.email = el.value)}
                  />
                </label>
              </div>

              {emailChanged && (
                <div>
                  <label class={labelClass}>
                    Current password <span class="font-normal text-subtle">(to confirm email change)</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      class={inputClass}
                      value={profile.current_password}
                      onInput$={(_, el) => (profile.current_password = el.value)}
                    />
                  </label>
                </div>
              )}

              <div class="pt-1">
                <button type="submit" disabled={profileSaving.value} class={submitClass}>
                  {profileSaving.value ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Password */}
          <section
            aria-labelledby="password-heading"
            class="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line"
          >
            <h2
              id="password-heading"
              class="text-lg font-semibold tracking-tight text-foreground"
            >
              Password
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Changing your password signs out your other sessions.
            </p>

            {passwordError.value && (
              <p role="alert" class={errorClass}>
                {passwordError.value}
              </p>
            )}
            {passwordOk.value && (
              <p role="status" class={okClass}>
                {passwordOk.value}
              </p>
            )}

            <form preventdefault:submit onSubmit$={savePassword} class="mt-5 space-y-4">
              <div>
                <label class={labelClass}>
                  Current password
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    class={inputClass}
                    value={password.current_password}
                    onInput$={(_, el) => (password.current_password = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  New password{" "}
                  <span class="font-normal text-subtle">
                    (at least {MIN_PASSWORD_LENGTH} characters)
                  </span>
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    class={inputClass}
                    value={password.new_password}
                    onInput$={(_, el) => (password.new_password = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Confirm new password
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    class={inputClass}
                    value={password.confirm}
                    onInput$={(_, el) => (password.confirm = el.value)}
                  />
                </label>
              </div>

              <div class="pt-1">
                <button type="submit" disabled={passwordSaving.value} class={submitClass}>
                  {passwordSaving.value ? "Saving…" : "Change password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
});
