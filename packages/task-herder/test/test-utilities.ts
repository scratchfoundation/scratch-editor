export async function waitTicks(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    // `await <expr>` always yields to the event loop, even if `<expr>` is not a Promise.
    // `await Promise.resolve()` may yield more than once.
    await void 0 // eslint-disable-line @typescript-eslint/await-thenable -- See detailed comment above.
  }
}

export async function waitTime(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function makeTask(taskStates: Record<string, string>, name: string, delay = 0): () => Promise<void> {
  return async () => {
    // console.log(`Starting task ${name} at ${Date.now()}`);
    taskStates[name] = 'started'
    if (delay > 0) {
      await waitTime(delay)
    }
    taskStates[name] = 'finished'
    // console.log(`Finished task ${name} at ${Date.now()}`);
  }
}
