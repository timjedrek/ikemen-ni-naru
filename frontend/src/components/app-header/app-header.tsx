import { $, component$ } from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { LogNav } from "~/components/log-nav/log-nav";
import { Logo } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import { logout, type User } from "~/services/api";

/**
 * The shared top bar for every authed page. Owns the one piece of chrome that
 * used to be copy-pasted across all of them: the logo lockup, the cross-page
 * nav, the "signed in as" link into account settings, theme toggle, and logout.
 *
 * `width` matches the page's own content max-width so the bar lines up with the
 * body below it (pages use 4xl/5xl/6xl). `user` is passed in because each page
 * already resolves it during its auth check.
 */
export const AppHeader = component$<{
  user: User | null;
  width?: string;
}>(({ user, width = "max-w-5xl" }) => {
  const nav = useNavigate();

  const doLogout = $(async () => {
    await logout();
    await nav("/login");
  });

  return (
    <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
      <div class={`mx-auto flex ${width} items-center justify-between gap-4 px-6 py-3.5`}>
        {/* Logo doubles as the home link (the dashboard is the landing page). */}
        <Link href="/dashboard" class="flex items-center" aria-label="Ikemen ni Naru — dashboard">
          <Logo class="h-8 w-auto" />
        </Link>
        <LogNav />
        <div class="flex items-center gap-3">
          {/* The name is the entry point to account settings. */}
          <Link
            href="/settings"
            title="Account settings"
            class="hidden text-sm text-muted underline-offset-2 hover:text-foreground hover:underline lg:inline"
          >
            Signed in as{" "}
            <span class="font-medium text-foreground">
              {user?.display_name || user?.email}
            </span>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick$={doLogout}
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
});
