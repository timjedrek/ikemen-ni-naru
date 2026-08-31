import { component$ } from "@builder.io/qwik";

// Compact summary tile shared by every tracker's header stats (calories, latest
// weight, mood score, sleep duration, …). Extracted from the four tracker pages
// where it was duplicated byte-for-byte.
export const StatCard = component$<{
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}>(({ label, value, unit, accent }) => {
  return (
    <div
      class={`rounded-xl p-4 shadow-sm ring-1 ${
        accent
          ? "bg-gradient-to-br from-brand-600 to-accent-600 text-white ring-transparent"
          : "bg-surface text-foreground ring-line"
      }`}
    >
      <p
        class={`text-xs font-medium uppercase tracking-wide ${accent ? "text-white/80" : "text-muted"}`}
      >
        {label}
      </p>
      <p class="mt-1 text-2xl font-bold tracking-tight">
        {value}
        <span
          class={`ml-1 text-sm font-normal ${accent ? "text-white/70" : "text-subtle"}`}
        >
          {unit}
        </span>
      </p>
    </div>
  );
});
