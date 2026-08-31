import {
  $,
  type QRL,
  useComputed$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { ApiError, getCurrentUser, type ListParams, type User } from "~/services/api";
import type { TrackerMode } from "~/components/tracker/tracker-shell";
import { todayIso } from "~/utils/datetime";

// How many entries a "Show all" page loads at a time (infinite scroll).
const PAGE_SIZE = 10;
// Day mode loads the whole selected day in one go (a day easily fits).
const DAY_LIMIT = 200;

// Everything that differs per tracker. Data access + form transforms are QRLs so
// the hook's own tasks/handlers can capture them across Qwik's serialization
// boundary; `initialForm` is a plain object for the synchronous useStore init.
export type TrackerConfig<E extends { id: number }, F extends object> = {
  initialForm: F;
  blankForm$: QRL<() => F>;
  list$: QRL<(params: ListParams) => Promise<{ items: E[]; total: number }>>;
  getById$: QRL<(id: number) => Promise<E | undefined>>;
  create$: QRL<(payload: unknown) => Promise<unknown>>;
  update$: QRL<(id: number, payload: unknown) => Promise<unknown>>;
  delete$: QRL<(id: number) => Promise<unknown>>;
  // form -> API payload (ctx.date is the selected day, for date-scoped food)
  toPayload$: QRL<(form: F, ctx: { date: string }) => unknown>;
  fromEntry$: QRL<(entry: E) => F>; // entry -> form fields, for editing
  validate$?: QRL<(form: F) => string | null>; // e.g. sleep's end > start
  afterStartEdit$?: QRL<(entry: E) => void>; // tracker-specific edit extras
  afterReset$?: QRL<() => void>; // tracker-specific reset extras
};

// Shared state + behavior for the four tracker log pages: auth gate, Day/Feed
// modes, date-scoped loading + infinite-scroll pagination, the ?date/?edit deep
// link, and create/update/delete/edit wiring. Pages keep only their own form
// fields, row mapping, and summary. Centralizing the two visible tasks here also
// enforces the QRL-declaration-order fix once (handlers are declared above the
// tasks), so it can't regress per page.
export function useTrackerLog<E extends { id: number }, F extends object>(
  config: TrackerConfig<E, F>,
) {
  const nav = useNavigate();

  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  const items = useSignal<E[]>([]);
  const total = useSignal(0);
  const listError = useSignal<string | null>(null);
  const listLoading = useSignal(false);
  const loadingMore = useSignal(false);

  const mode = useSignal<TrackerMode>("day");
  const selectedDate = useSignal("");

  const form = useStore<F>(config.initialForm);
  const formRef = useSignal<HTMLElement>();
  const editingId = useSignal<number | null>(null);
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);

  const hasMore = useComputed$(
    () => mode.value === "all" && items.value.length < total.value,
  );

  const reload = $(async () => {
    if (mode.value === "day" && !selectedDate.value) return;
    listLoading.value = true;
    try {
      const params: ListParams =
        mode.value === "day"
          ? { date: selectedDate.value, limit: DAY_LIMIT, offset: 0 }
          : { limit: PAGE_SIZE, offset: 0 };
      const res = await config.list$(params);
      items.value = res.items;
      total.value = res.total;
      listError.value = null;
    } catch (err) {
      listError.value =
        err instanceof Error ? err.message : "Failed to load entries";
    } finally {
      listLoading.value = false;
    }
  });

  const loadMore = $(async () => {
    if (mode.value !== "all" || loadingMore.value) return;
    if (items.value.length >= total.value) return;
    loadingMore.value = true;
    try {
      const res = await config.list$({
        limit: PAGE_SIZE,
        offset: items.value.length,
      });
      items.value = [...items.value, ...res.items]; // new array ref → reactive
      total.value = res.total;
    } catch (err) {
      listError.value =
        err instanceof Error ? err.message : "Failed to load more entries";
    } finally {
      loadingMore.value = false;
    }
  });

  const resetForm = $(async () => {
    Object.assign(form, await config.blankForm$());
    editingId.value = null;
    formError.value = null;
    if (config.afterReset$) await config.afterReset$();
  });

  // Drop ?edit from the URL after opening (or failing to open) the form, so a
  // later reload or date change can't re-trigger editing from a stale param.
  const clearEditParam = $(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (!u.searchParams.has("edit")) return;
    u.searchParams.delete("edit");
    window.history.replaceState(null, "", u.pathname + u.search);
  });

  // On the single-column mobile/tablet layout the form is stacked above the
  // list, so editing a lower entry leaves it off-screen. On desktop (lg+) the
  // form is sticky and always visible, so only scroll below that breakpoint.
  const scrollFormIntoView = $(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const startEdit = $(async (entry: E) => {
    Object.assign(form, await config.fromEntry$(entry));
    editingId.value = entry.id;
    formError.value = null;
    if (config.afterStartEdit$) await config.afterStartEdit$(entry);
    await scrollFormIntoView();
  });

  const submit = $(async () => {
    submitting.value = true;
    formError.value = null;
    try {
      if (config.validate$) {
        const err = await config.validate$(form);
        if (err) {
          formError.value = err;
          return;
        }
      }
      const payload = await config.toPayload$(form, { date: selectedDate.value });
      if (editingId.value !== null) {
        await config.update$(editingId.value, payload);
      } else {
        await config.create$(payload);
      }
      await resetForm();
      await reload();
    } catch (err) {
      formError.value =
        err instanceof ApiError ? err.message : "Something went wrong. Try again.";
    } finally {
      submitting.value = false;
    }
  });

  const remove = $(async (id: number) => {
    try {
      await config.delete$(id);
      if (editingId.value === id) await resetForm();
      await reload();
    } catch (err) {
      listError.value =
        err instanceof Error ? err.message : "Failed to delete entry";
    }
  });

  const setDate = $((date: string) => {
    selectedDate.value = date;
  });

  const toggleMode = $(() => {
    mode.value = mode.value === "day" ? "all" : "day";
  });

  // Auth gate: confirm a session before rendering protected data, and seed the
  // selected day from ?date (a deep link from the day report) or default today.
  // Read from window.location, not useLocation — the reactive loc.url can be
  // stale right after an SPA nav from the day report, dropping the params.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    authChecked.value = true;
    const params = new URLSearchParams(window.location.search);
    selectedDate.value = params.get("date") || todayIso();
  });

  // Reload whenever the day or mode changes (once authenticated), then handle a
  // ?edit deep link: open that entry's edit form, fetching it by id if it isn't
  // in the loaded page. NOTE: references reload/startEdit/clearEditParam, which
  // the Qwik optimizer captures by lexical scope at registration time — they are
  // declared above this task on purpose.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => selectedDate.value);
    track(() => mode.value);
    if (!authChecked.value) return;
    await reload();
    const editId = Number(new URLSearchParams(window.location.search).get("edit"));
    if (editId) {
      let entry = items.value.find((e) => e.id === editId);
      if (!entry) entry = await config.getById$(editId);
      if (entry) await startEdit(entry);
      clearEditParam();
    }
  });

  return {
    authUser,
    authChecked,
    items,
    total,
    hasMore,
    listError,
    listLoading,
    loadingMore,
    mode,
    selectedDate,
    form,
    formRef,
    editingId,
    submitting,
    formError,
    reload,
    loadMore,
    submit,
    startEdit,
    remove,
    resetForm,
    setDate,
    toggleMode,
  };
}
