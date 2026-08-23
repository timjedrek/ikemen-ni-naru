import {
  component$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { getHealth } from '~/services/api';
import type { HealthResponse } from '~/types/health';

export default component$(() => {
  const health = useSignal<HealthResponse | null>(null);
  const error = useSignal<string | null>(null);
  const loading = useSignal(true);

  useVisibleTask$(async () => {
    try {
      health.value = await getHealth();
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error
          ? caughtError.message
          : 'An unknown error occurred';
    } finally {
      loading.value = false;
    }
  });

  return (
    <main>
      <h1>Health Tracker</h1>

      {loading.value && <p>Checking the FastAPI backend...</p>}

      {error.value && (
        <section>
          <h2>Backend connection failed</h2>
          <p>{error.value}</p>
        </section>
      )}

      {health.value && (
        <section>
          <h2>Backend connection successful</h2>
          <p>
            API status: <strong>{health.value.status ?? 'Unknown'}</strong>
          </p>

          <pre>{JSON.stringify(health.value, null, 2)}</pre>
        </section>
      )}
    </main>
  );
});
