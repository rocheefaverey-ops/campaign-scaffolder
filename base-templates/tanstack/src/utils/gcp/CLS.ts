import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<any>();

const r: any = new Proxy(storage, {
  get(_, prop) {
    // Get the current store (safe, handles nesting automatically)
    const store = storage.getStore();

    // Handle your custom magic methods
    if (prop === '$hold') {
      // Note: In ALS, context is usually immutable/scoped.
      // You might need to adapt your logic if you strictly need mutable flags.
      return (hold: any) => {
        if (store) store['$HOLD'] = !!hold;
      };
    }

    if (prop === '$init') {
      return (fn: any) => {
        const context = store ? { ...store, $HOLD: true } : { $HOLD: true };
        return (...args: any) => storage.run(context, () => fn(...args));
      };
    }

    // Return property from store, or undefined if store is empty
    return store ? store[prop] : undefined;
  },
  set(_, prop, value) {
    const store = storage.getStore();
    if (store) {
      store[prop] = value;
      return true;
    }
    return false;
  },
  has(_, prop) {
    const store = storage.getStore();
    return store ? prop in store : false;
  },
});

// Helper to wrap the root of your application/request
export const run = (fn: () => void) => storage.run({}, fn);

export default r;
