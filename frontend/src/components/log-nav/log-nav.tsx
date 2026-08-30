import { component$ } from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";

// The four logging features plus the charts dashboard. Each is its own page;
// this nav lets the user move between them from any app bar. Hidden on small
// screens to keep mobile chrome uncluttered (same treatment as the "Signed in
// as" text).
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/food", label: "Food" },
  { href: "/weight", label: "Weight" },
  { href: "/mood", label: "Mood" },
  { href: "/sleep", label: "Sleep" },
];

export const LogNav = component$(() => {
  const nav = useNavigate();
  const path = useLocation().url.pathname;
  return (
    <nav class="hidden items-center gap-1 sm:flex">
      {LINKS.map((link) => {
        const active = path.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            class={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      {/* Jump straight to any day's breakdown, from any page. */}
      <label class="ml-1 flex items-center gap-1.5 text-sm text-muted">
        <span class="sr-only">Jump to date</span>
        <input
          type="date"
          aria-label="Jump to date"
          title="Jump to a day"
          onChange$={(_, el) => {
            if (el.value) nav(`/day/${el.value}`);
          }}
          class="rounded-lg border-0 bg-surface px-2 py-1 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
        />
      </label>
    </nav>
  );
});
