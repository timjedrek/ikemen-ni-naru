import { component$ } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

// The four logging features. Each is its own page; this nav lets the user move
// between them from any app bar. Hidden on small screens to keep mobile chrome
// uncluttered (same treatment as the "Signed in as" text).
const LINKS = [
  { href: "/food", label: "Food" },
  { href: "/weight", label: "Weight" },
  { href: "/mood", label: "Mood" },
  { href: "/sleep", label: "Sleep" },
];

export const LogNav = component$(() => {
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
    </nav>
  );
});
