declare const __OFFLINE_BUILD_ID__: string;

export type OfflineSnapshot = Readonly<{
  status: 'unsupported' | 'preparing' | 'ready' | 'error';
  updateAvailable: boolean;
  errorCode:
    | null
    | 'registration-failed'
    | 'installation-failed'
    | 'cache-incomplete'
    | 'verification-timeout'
    | 'version-mismatch';
}>;


type ProbeResult = {
  buildId: string;
  complete: boolean;
  reason: 'version-mismatch' | 'cache-incomplete' | null;
};

type ProbeOptions = {
  repair: boolean;
};

const PROBE_TIMEOUT_MS = 60_000;
const listeners = new Set<() => void>();
const observedWorkers = new WeakSet<ServiceWorker>();
const observedRegistrations = new WeakSet<ServiceWorkerRegistration>();

const unsupportedSnapshot: OfflineSnapshot = Object.freeze({
  status: 'unsupported',
  updateAvailable: false,
  errorCode: null,
});

let snapshot: OfflineSnapshot = unsupportedSnapshot;
let initialized = false;
let registration: ServiceWorkerRegistration | undefined;
let preparation: Promise<void> | undefined;
let preparationRepairs = false;
let repairPreparation: Promise<void> | undefined;
let followUpProbe = false;
let followUpRepairs = false;
let probeGeneration = 0;

function isOfflineRuntimeSupported(): boolean {
  return (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator
  );
}

function publish(next: OfflineSnapshot): void {
  if (
    snapshot.status === next.status &&
    snapshot.updateAvailable === next.updateAvailable &&
    snapshot.errorCode === next.errorCode
  ) {
    return;
  }

  snapshot = Object.freeze(next);
  listeners.forEach((listener) => listener());
}

function setSnapshot(
  status: OfflineSnapshot['status'],
  errorCode: OfflineSnapshot['errorCode'] = null,
): void {
  publish({
    status,
    updateAvailable: Boolean(registration?.waiting),
    errorCode,
  });
}

function refreshUpdateAvailability(): void {
  publish({
    ...snapshot,
    updateAvailable: Boolean(registration?.waiting),
  });
}

function reportInstallationFailure(): void {
  refreshUpdateAvailability();
  if (snapshot.status !== 'ready') {
    setSnapshot('error', 'installation-failed');
  }
}

function observeWorker(worker: ServiceWorker | null): void {
  if (!worker || observedWorkers.has(worker)) {
    return;
  }

  observedWorkers.add(worker);
  worker.addEventListener('statechange', () => {
    refreshUpdateAvailability();

    if (worker.state === 'redundant') {
      reportInstallationFailure();
      return;
    }

    if (worker.state === 'activated') {
      void schedulePreparation({ repair: false });
    }
  });
}

function observeRegistration(nextRegistration: ServiceWorkerRegistration): void {
  observeWorker(nextRegistration.installing);
  observeWorker(nextRegistration.waiting);
  observeWorker(nextRegistration.active);
  refreshUpdateAvailability();

  if (observedRegistrations.has(nextRegistration)) {
    return;
  }

  observedRegistrations.add(nextRegistration);
  nextRegistration.addEventListener('updatefound', () => {
    observeWorker(nextRegistration.installing);
    refreshUpdateAvailability();
  });
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (registration) {
    return registration;
  }

  try {
    const nextRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'classic',
      updateViaCache: 'none',
    });
    registration = nextRegistration;
    observeRegistration(nextRegistration);
    return nextRegistration;
  } catch {
    setSnapshot('error', 'registration-failed');
    return undefined;
  }
}

function probeController(
  controller: ServiceWorker,
  { repair }: ProbeOptions,
): Promise<ProbeResult | undefined> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const finish = (result: ProbeResult | undefined): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      channel.port1.onmessage = null;
      channel.port1.close();
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => finish(undefined), PROBE_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const response = event.data;
      if (
        !response ||
        typeof response !== 'object' ||
        !('type' in response) ||
        response.type !== 'GLASANJE_OFFLINE_RESULT' ||
        !('buildId' in response) ||
        typeof response.buildId !== 'string' ||
        !('complete' in response) ||
        typeof response.complete !== 'boolean' ||
        !('reason' in response) ||
        (response.reason !== null &&
          response.reason !== 'version-mismatch' &&
          response.reason !== 'cache-incomplete')
      ) {
        return;
      }

      finish({
        buildId: response.buildId,
        complete: response.complete,
        reason: response.reason,
      });
    };

    try {
      controller.postMessage(
        {
          type: 'GLASANJE_OFFLINE_PROBE',
          buildId: __OFFLINE_BUILD_ID__,
          repair,
        },
        [channel.port2],
      );
    } catch {
      finish(undefined);
    }
  });
}

async function prepareOffline({ repair }: ProbeOptions): Promise<void> {
  const nextRegistration = await ensureRegistration();
  if (!nextRegistration) {
    return;
  }

  if (repair) {
    try {
      await nextRegistration.update();
    } catch {
      if (snapshot.status !== 'ready') {
        setSnapshot('error', 'installation-failed');
      }
    }
    observeRegistration(nextRegistration);
  }

  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    setSnapshot('preparing');
    return;
  }

  const generation = ++probeGeneration;
  setSnapshot('preparing');
  const result = await probeController(controller, { repair });

  if (
    generation !== probeGeneration ||
    navigator.serviceWorker.controller !== controller
  ) {
    followUpProbe = true;
    return;
  }

  if (!result) {
    setSnapshot('error', 'verification-timeout');
    return;
  }

  if (result.buildId !== __OFFLINE_BUILD_ID__ || result.reason === 'version-mismatch') {
    setSnapshot('error', 'version-mismatch');
    return;
  }

  if (!result.complete || result.reason === 'cache-incomplete') {
    setSnapshot('error', 'cache-incomplete');
    return;
  }

  setSnapshot('ready');
}

function schedulePreparation(options: ProbeOptions): Promise<void> {
  if (preparation) {
    if (options.repair && preparationRepairs) {
      return preparation;
    }

    followUpProbe = true;

    if (!options.repair) {
      return preparation;
    }

    followUpRepairs = true;
    return preparation.then(() => schedulePreparation({ repair: true }));
  }

  const repair = options.repair || followUpRepairs;
  followUpRepairs = false;
  preparationRepairs = repair;
  preparation = prepareOffline({ repair }).finally(() => {
    preparation = undefined;
    preparationRepairs = false;
    if (followUpProbe) {
      followUpProbe = false;
      void schedulePreparation({ repair: followUpRepairs });
    }
  });
  return preparation;
}

function prepareForForeground(): void {
  void schedulePreparation({ repair: false }).then(() => {
    if (navigator.onLine && snapshot.errorCode === 'cache-incomplete') {
      void retryOfflinePreparation();
    }
  });
}

function attachLifecycleListeners(): void {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    void schedulePreparation({ repair: false });
  });

  window.addEventListener('pageshow', () => {
    prepareForForeground();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      prepareForForeground();
    }
  });

  window.addEventListener('online', () => {
    if (snapshot.status === 'error') {
      void retryOfflinePreparation();
    }
  });
}

export function initializeOffline(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  if (!isOfflineRuntimeSupported()) {
    return;
  }

  attachLifecycleListeners();
  void schedulePreparation({ repair: false });
}

export function getOfflineSnapshot(): OfflineSnapshot {
  return snapshot;
}

export function subscribeOffline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function retryOfflinePreparation(): Promise<void> {
  if (!initialized) {
    initializeOffline();
  }

  if (!isOfflineRuntimeSupported()) {
    return Promise.resolve();
  }

  if (repairPreparation) {
    return repairPreparation;
  }

  repairPreparation = schedulePreparation({ repair: true }).finally(() => {
    repairPreparation = undefined;
  });

  return repairPreparation;
}
