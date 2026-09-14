export function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    enqueue<T>(write: () => Promise<T>): Promise<T> {
      const result = tail.then(write);
      // The caller receives the failure; later flushes must not replay it.
      tail = result.catch(() => undefined);
      return result;
    },
    idle: () => tail,
  };
}
