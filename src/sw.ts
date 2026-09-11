/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import type { RouteHandlerCallback } from 'workbox-core/types.js';
import { PrecacheController, PrecacheRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;
declare const __OFFLINE_BUILD_ID__: string;

type OfflineProbe = Readonly<{
  type: 'GLASANJE_OFFLINE_PROBE';
  buildId: string;
  repair: boolean;
}>;

type OfflineProbeResult = Readonly<{
  type: 'GLASANJE_OFFLINE_RESULT';
  buildId: string;
  complete: boolean;
  reason: null | 'version-mismatch' | 'cache-incomplete';
}>;

const precacheController = new PrecacheController({
  cacheName: 'glasanje-precache-v1',
});

precacheController.precache(self.__WB_MANIFEST);
registerRoute(
  new PrecacheRoute(precacheController, {
    ignoreURLParametersMatching: [],
    cleanURLs: false,
    directoryIndex: 'index.html',
  }),
);
function createIntegrityCheckedPrecacheHandler(url: string): RouteHandlerCallback {
  const cacheKey = precacheController.getCacheKeyForURL(url);
  const integrity = cacheKey && precacheController.getIntegrityForCacheKey(cacheKey);

  if (!cacheKey || !integrity) {
    throw new Error(`Missing manifest integrity for precached navigation: ${url}`);
  }

  return ({ event }) =>
    precacheController.strategy.handle({
      event: event as FetchEvent,
      request: new Request(url, {
        credentials: 'same-origin',
        integrity,
      }),
      params: { cacheKey, integrity },
    });
}

registerRoute(
  new NavigationRoute(createIntegrityCheckedPrecacheHandler('/index.html'), {
    allowlist: [/^\/(?:index\.html|status)?(?:\?.*)?$/],
  }),
);

clientsClaim();
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('glasanje-offline-v4'));
});

function isOfflineProbe(value: unknown): value is OfflineProbe {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const probe = value as Partial<OfflineProbe>;
  return (
    probe.type === 'GLASANJE_OFFLINE_PROBE' &&
    typeof probe.buildId === 'string' &&
    typeof probe.repair === 'boolean'
  );
}

async function getMissingPrecacheEntries(): Promise<Map<string, string>> {
  const cache = await caches.open(precacheController.strategy.cacheName);
  const missingEntries = new Map<string, string>();

  for (const [url, cacheKey] of precacheController.getURLsToCacheKeys()) {
    if (!(await cache.match(cacheKey))) {
      missingEntries.set(url, cacheKey);
    }
  }

  return missingEntries;
}

async function repairPrecacheEntries(
  event: ExtendableMessageEvent,
  missingEntries: Map<string, string>,
): Promise<void> {
  for (const [url, cacheKey] of missingEntries) {
    const [response, completion] = precacheController.strategy.handleAll({
      event,
      request: new Request(url, {
        cache: 'reload',
        credentials: 'same-origin',
      }),
      params: {
        cacheKey,
        integrity: precacheController.getIntegrityForCacheKey(cacheKey),
      },
    });

    await response;
    await completion;
  }
}

async function respondToProbe(
  event: ExtendableMessageEvent,
  port: MessagePort,
  probe: OfflineProbe,
): Promise<void> {
  if (probe.buildId !== __OFFLINE_BUILD_ID__) {
    const result: OfflineProbeResult = {
      type: 'GLASANJE_OFFLINE_RESULT',
      buildId: __OFFLINE_BUILD_ID__,
      complete: false,
      reason: 'version-mismatch',
    };
    port.postMessage(result);
    return;
  }

  let missingEntries: Map<string, string>;
  try {
    missingEntries = await getMissingPrecacheEntries();
    if (probe.repair && missingEntries.size > 0) {
      await repairPrecacheEntries(event, missingEntries);
      missingEntries = await getMissingPrecacheEntries();
    }
  } catch {
    const result: OfflineProbeResult = {
      type: 'GLASANJE_OFFLINE_RESULT',
      buildId: __OFFLINE_BUILD_ID__,
      complete: false,
      reason: 'cache-incomplete',
    };
    port.postMessage(result);
    return;
  }

  const complete = missingEntries.size === 0;
  const result: OfflineProbeResult = {
    type: 'GLASANJE_OFFLINE_RESULT',
    buildId: __OFFLINE_BUILD_ID__,
    complete,
    reason: complete ? null : 'cache-incomplete',
  };
  port.postMessage(result);
}

self.addEventListener('message', (event) => {
  if (!isOfflineProbe(event.data) || event.ports.length !== 1) {
    return;
  }

  event.waitUntil(respondToProbe(event, event.ports[0], event.data));
});
