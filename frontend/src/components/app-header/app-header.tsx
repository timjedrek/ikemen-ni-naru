import { $, component$, useSignal } from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { LINKS, LogNav } from "~/components/log-nav/log-nav";
import { Logo } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import { logout, type User } from "~/services/api";

/**
 * The shared top bar for every authed page. Owns the one piece of chrome that
 * used to be copy-pasted across all of them: the logo lockup, the cross-page
 * nav, the "signed in as" link into account settings, theme toggle, and logout.
 *
 * The bar uses one fixed content width on every page (independent of each page's
 * own body width) so the nav always has room and lines up identically site-wide.
 * `user` is passed in because each page already resolves it during its auth check.
 */
export const AppHeader = component$<{ user: User | null }>(({ user }) => {
  const nav = useNavigate();
  const path = useLocation().url.pathname;
  const menuOpen = useSignal(false);

  const doLogout = $(async () => {
    await logout();
    await nav("/login");
  });

  return (
    <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
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
          {/* Desktop keeps a plain logout button; the full nav lives in LogNav. */}
          <button
            type="button"
            onClick$={doLogout}
            class="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground sm:inline-block"
          >
            Log out
          </button>
          {/* Mobile: the logout button is replaced by a hamburger that opens the
              nav + account actions in a dropdown. */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen.value}
            onClick$={() => (menuOpen.value = !menuOpen.value)}
            class="rounded-lg p-2 text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground sm:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              {menuOpen.value ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel. */}
      {menuOpen.value && (
        <nav class="border-t border-line bg-surface px-6 py-3 sm:hidden">
          <ul class="flex flex-col gap-1">
            {LINKS.map((link) => {
              const active = path.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick$={() => (menuOpen.value = false)}
                    class={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-surface-muted text-foreground"
                        : "text-muted hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/settings"
                onClick$={() => (menuOpen.value = false)}
                class="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Account settings
              </Link>
            </li>
            {/* Jump straight to any day's breakdown. */}
            <li>
              <label class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted">
                <span>Jump to date</span>
                <input
                  type="date"
                  aria-label="Jump to date"
                  onChange$={(_, el) => {
                    if (el.value) {
                      menuOpen.value = false;
                      nav(`/day/${el.value}`);
                    }
                  }}
                  class="rounded-lg border-0 bg-surface px-2 py-1 text-foreground shadow-sm ring-1 ring-inset ring-line-strong [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:[color-scheme:dark]"
                />
              </label>
            </li>
          </ul>
          <div class="mt-2 border-t border-line pt-2">
            <button
              type="button"
              onClick$={doLogout}
              class="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Log out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
});
