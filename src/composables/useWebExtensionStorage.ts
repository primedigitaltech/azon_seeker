import { StorageSerializers } from '@vueuse/core';
import { debounceFilter, pausableWatch, tryOnScopeDispose } from '@vueuse/shared';
import { ref, shallowRef } from 'vue-demi';
import { storage } from 'webextension-polyfill';

import type { RemovableRef, StorageLikeAsync, UseStorageAsyncOptions } from '@vueuse/core';
import type { Ref } from 'vue-demi';
import type { Storage } from 'webextension-polyfill';

export type WebExtensionStorageOptions<T> = UseStorageAsyncOptions<T>;

// https://github.com/vueuse/vueuse/blob/658444bf9f8b96118dbd06eba411bb6639e24e88/packages/core/useStorage/guess.ts
export function guessSerializerType(rawInit: unknown) {
  return rawInit == null
    ? 'any'
    : rawInit instanceof Set
      ? 'set'
      : rawInit instanceof Map
        ? 'map'
        : rawInit instanceof Date
          ? 'date'
          : typeof rawInit === 'boolean'
            ? 'boolean'
            : typeof rawInit === 'string'
              ? 'string'
              : typeof rawInit === 'object'
                ? 'object'
                : Number.isNaN(rawInit)
                  ? 'any'
                  : 'number';
}

const storageInterface: StorageLikeAsync = {
  removeItem(key: string) {
    return storage.local.remove(key);
  },

  setItem(key: string, value: string) {
    return storage.local.set({ [key]: value });
  },

  async getItem(key: string) {
    const storedData = await storage.local.get(key);

    return storedData[key] as string;
  },
};

/**
 * https://github.com/vueuse/vueuse/blob/658444bf9f8b96118dbd06eba411bb6639e24e88/packages/core/useStorageAsync/index.ts
 *
 * A custom hook for managing state with Web Extension storage.
 * This function allows you to synchronize a reactive state with the Web Extension storage API.
 *
 * @param key - The key under which the value is stored in the Web Extension storage.
 * @param initialValue - The initial value to be used if no value is found in storage.
 *                                      This can be a reactive reference or a plain value.
 * @param options - Optional settings for the storage behavior.
 *
 * @returns A reactive reference to the stored value. The reference can be
 *                            removed from the storage by calling its `remove` method.
 *
 * @example
 * const myValue = useWebExtensionStorage2('myKey', 'defaultValue', {
 *   shallow: true,
 *   listenToStorageChanges: true,
 * });
 *
 * // myValue is now a reactive reference that syncs with the Web Extension storage.
 */
export function useWebExtensionStorage<T>(
  key: string,
  initialValue: MaybeRef<T>,
  options: Pick<
    WebExtensionStorageOptions<T>,
    'shallow' | 'serializer' | 'flush' | 'deep' | 'eventFilter'
  > & { listenToStorageChanges?: boolean | 'sidepanel' | 'options' } = {},
): RemovableRef<T> {
  const {
    shallow = false,
    listenToStorageChanges = true,
    flush = 'pre',
    deep = true,
    eventFilter = debounceFilter(1000),
  } = options;

  const rawInit = unref(initialValue);
  const type = guessSerializerType(rawInit);
  const data = (shallow ? shallowRef : ref)(rawInit) as Ref<T>;

  const serializer = options.serializer ?? StorageSerializers[type];

  const pullFromStorage = async () => {
    const rawItem = await storageInterface.getItem(key);
    if (rawItem) {
      const item = serializer.read(rawItem) as T;
      data.value = item;
    }
  };

  const pushToStorage = async () => {
    const newVal = toRaw(unref(data));
    if (newVal === null) {
      await storageInterface.removeItem(key);
    } else {
      const item = await serializer.write(newVal);
      await storageInterface.setItem(key, item);
    }
  };

  const { pause: pauseWatch, resume: resumeWatch } = pausableWatch(data, pushToStorage, {
    flush,
    deep,
    eventFilter,
  });

  if (listenToStorageChanges) {
    const listener = async (changes: Record<string, Storage.StorageChange>) => {
      if (!(key in changes)) {
        return;
      }
      if (typeof listenToStorageChanges === 'string') {
        if (listenToStorageChanges !== appContext) {
          return;
        }
      }
      try {
        pauseWatch();
        await pullFromStorage();
      } finally {
        resumeWatch();
      }
    };

    storage.onChanged.addListener(listener);

    tryOnScopeDispose(() => {
      storage.onChanged.removeListener(listener);
    });
  }

  void pullFromStorage(); // Init

  return data;
}
