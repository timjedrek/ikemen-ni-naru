import { component$, type QRL, useSignal, useVisibleTask$ } from "@builder.io/qwik";

// An invisible marker placed at the bottom of the list in "Show all" mode. When
// it scrolls into view (the user reached the end of the loaded entries), it
// calls onIntersect$ to load the next page. Using an IntersectionObserver on a
// sentinel is cheaper and cleaner than a scroll handler, and unmounts cleanly.
export const InfiniteSentinel = component$<{ onIntersect$: QRL<() => void> }>(
  ({ onIntersect$ }) => {
    const ref = useSignal<HTMLElement>();

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
      const el = ref.value;
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) onIntersect$();
        },
        { rootMargin: "200px" },
      );
      io.observe(el);
      cleanup(() => io.disconnect());
    });

    return <div ref={ref} aria-hidden="true" class="h-px w-full" />;
  },
);
