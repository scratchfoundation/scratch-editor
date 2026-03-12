import { PromiseWithResolvers } from './PromiseWithResolvers'

export interface TaskOptions {
  /** Cost of the task in tokens (default: 1) */
  cost?: number
  /** If set, the task will be aborted if this signal is triggered */
  signal?: AbortSignal
}
export class TaskRecord<T> {
  /** The cost of the task in tokens */
  public readonly cost: number
  /** The promise wrapping the task */
  public readonly promise: Promise<T>
  /** Run the task and settle the promise */
  public readonly run: () => Promise<void>
  /** Cancel the task and reject the promise */
  public readonly cancel: (e: Error) => void

  /**
   * @param task The task to wrap.
   * @param options The options for the task.
   */
  constructor(task: () => T | Promise<T>, options: TaskOptions = {}) {
    this.cost = options.cost ?? 1

    const { promise, resolve, reject } = PromiseWithResolvers<T>()

    this.promise = promise
    this.cancel = (e) => {
      reject(e)
    }
    this.run = async () => {
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
  }
}
