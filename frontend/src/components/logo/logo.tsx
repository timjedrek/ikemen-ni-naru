import { component$, useId } from "@builder.io/qwik";

// Shared silhouette + gradient stops for the app mark. The mark sits on the
// emerald→violet gradient in both themes, so it never needs a dark variant —
// only the wordmark text does (see Logo below).
const FACE_PATH =
  "M78.5 28.5 C96 24 114 36 118.5 58 C120.5 68 121 76 116.5 84.5 C123 91 121.5 102 111 110.5 C101 118 86 120 74 113 C66 124 49 130 36 120.5 C26 113 28 100 40 94 C34 88 30 78 32.5 66 C36 48 54 34 78.5 28.5 Z M52 96 C46 104 38 108 34 104.5 C30 101 33 93 42 90 C47 88 51 91 52 96 Z";

const GradientStops = component$(() => (
  <>
    <stop offset="0%" stop-color="#009965" />
    <stop offset="42%" stop-color="#00bc7c" />
    <stop offset="100%" stop-color="#ad46ff" />
  </>
));

/** Icon-only mark — for app bars, favicons, tight spaces. */
export const LogoMark = component$<{ class?: string }>(({ class: cls }) => {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 164 164"
      class={cls}
      role="img"
      aria-label="Ikemen ni Naru"
    >
      <defs>
        <linearGradient id={gid} x1="8%" y1="12%" x2="92%" y2="88%">
          <GradientStops />
        </linearGradient>
      </defs>
      <rect width="164" height="164" rx="38" fill={`url(#${gid})`} />
      <path fill="#fff" d={FACE_PATH} />
      <g
        fill="none"
        stroke={`url(#${gid})`}
        stroke-width="3.2"
        stroke-linecap="round"
      >
        <path d="M92 72.5 C96 71 101 71.5 105.5 74" />
        <path d="M94 90 C99 94 107 94.5 112.5 89.5" />
      </g>
    </svg>
  );
});

/**
 * Full lockup — icon + Japanese wordmark. The neutral part of the wordmark
 * ("イケメンにな") uses theme-aware fills so it stays legible in dark mode; the
 * final character ("る") keeps the violet accent.
 */
export const Logo = component$<{ class?: string }>(({ class: cls }) => {
  const gid = useId();
  return (
    <svg
      viewBox="48 0 772 280"
      class={cls}
      role="img"
      aria-label="イケメンになる — Ikemen ni Naru"
    >
      <defs>
        <linearGradient id={gid} x1="8%" y1="12%" x2="92%" y2="88%">
          <GradientStops />
        </linearGradient>
      </defs>

      {/* App icon */}
      <g transform="translate(48 58)">
        <rect width="164" height="164" rx="38" fill={`url(#${gid})`} />
        <path fill="#fff" d={FACE_PATH} />
        <g
          fill="none"
          stroke={`url(#${gid})`}
          stroke-width="3.2"
          stroke-linecap="round"
        >
          <path d="M92 72.5 C96 71 101 71.5 105.5 74" />
          <path d="M94 90 C99 94 107 94.5 112.5 89.5" />
        </g>
      </g>

      {/* Wordmark */}
      <text
        x="248"
        y="156"
        font-family="'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', 'YuGothic', sans-serif"
        font-size="52"
        font-weight="500"
        letter-spacing="0.04em"
      >
        <tspan class="fill-slate-700 dark:fill-slate-100">イケメンにな</tspan>
        <tspan class="fill-accent-600 dark:fill-accent-400">る</tspan>
      </text>
    </svg>
  );
});
