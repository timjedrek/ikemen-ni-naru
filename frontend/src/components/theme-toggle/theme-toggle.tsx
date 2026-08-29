import { $, component$ } from "@builder.io/qwik";

/**
 * Light/dark toggle. The current theme lives as a `.dark` class on <html>,
 * set before paint by the inline script in root.tsx (so there's no flash) and
 * persisted to localStorage here. Which icon shows is driven purely by CSS
 * (`dark:` variants), so the button needs no reactive state and can't mismatch
 * during hydration.
 */
export const ThemeToggle = component$<{ class?: string }>(({ class: cls }) => {
  const toggle = $(() => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  return (
    <button
      type="button"
      onClick$={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      class={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${cls ?? ""}`}
    >
      {/* Moon — shown in light mode (click → go dark) */}
      <svg
        class="h-5 w-5 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Sun — shown in dark mode (click → go light) */}
      <svg
        class="hidden h-5 w-5 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
});
