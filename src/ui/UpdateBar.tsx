import { useEffect, useRef, useState } from 'react';
import { UndoIcon } from './Icons';

/**
 * Registers the service worker (production only) and offers a new version once it has
 * downloaded. It waits for Danilo's tap instead of swapping under an open page, which could
 * delete the old react-pdf chunk the page still needs. The app stays open for days on a phone,
 * so it also checks for updates each time it comes back to the foreground.
 */
function useWaitingWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    // A waiting worker is only an update when an older one already controls the page.
    const offer = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) setWaiting(worker);
    };
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed') offer(worker);
          });
        });
      })
      .catch(() => {
        // No offline support this time; the app itself still works.
      });
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return waiting;
}

/** `beforeUpdate` saves anything still pending, because updating reloads the page. */
export function UpdateBar({ beforeUpdate }: { beforeUpdate: () => void }) {
  const waiting = useWaitingWorker();
  const [later, setLater] = useState(false);
  const updating = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onController = () => {
      if (updating.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onController);
    };
  }, []);

  if (!waiting || later) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-40 flex items-center gap-2 rounded-field border border-l-4 border-line border-l-crimson-cta bg-surface py-1 pr-1 pl-3 text-ink shadow-[0_8px_24px_rgba(24,24,27,0.12)] lg:left-auto lg:w-[460px]"
    >
      <UndoIcon className="flex-none text-crimson-cta" />
      <span className="flex-1 text-[15px] font-semibold">Hay una versión nueva de la app.</span>
      <button
        type="button"
        onClick={() => {
          setLater(true);
        }}
        className="min-h-12 px-2.5 text-[15px] font-semibold underline underline-offset-4"
      >
        Después
      </button>
      <button
        type="button"
        onClick={() => {
          beforeUpdate();
          updating.current = true;
          // The generated service worker activates on this message (registerType: 'prompt').
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }}
        className="min-h-12 rounded-field bg-walnut-700 px-3.5 text-[15px] font-bold text-white hover:bg-walnut-900"
      >
        Actualizar
      </button>
    </div>
  );
}
