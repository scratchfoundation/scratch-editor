import { TaskQueue, type QueueOptions } from './TaskQueue'

/**
 * Manages multiple named task queues with shared or individual configurations. Each queue can be accessed by a
 * unique name or other identifier. For example, this can manage a separate queue for each of several different
 * servers, using the server's DNS name as the key.
 */
export class QueueManager<T = string> {
  private readonly queues: Map<T, TaskQueue>
  private readonly defaultOptions: QueueOptions

  /**
   * @param defaultOptions The options that will be used to initialize each queue.
   * These can be overridden later on a per-queue basis.
   * @param iterable An optional iterable of key-value pairs to initialize the manager with existing queues.
   */
  constructor(defaultOptions: QueueOptions, iterable?: Iterable<readonly [T, TaskQueue]> | null) {
    this.queues = new Map(iterable)
    this.defaultOptions = defaultOptions
  }

  /**
   * Create a new task queue with the given identifier. If a queue with that identifier already exists, it will be
   * replaced. If you need to cancel tasks in that queue before replacing it, do so manually first.
   * @param id The identifier for the queue.
   * @param overrides Optional overrides for the default QueueOptions for this specific queue.
   * @returns The newly created TaskQueue.
   */
  public create(id: T, overrides: Partial<QueueOptions> = {}): TaskQueue {
    const queue = new TaskQueue({ ...this.defaultOptions, ...overrides })
    this.queues.set(id, queue)
    return queue
  }

  /**
   * Get the task queue for the given identifier.
   * @param id The identifier for the queue.
   * @returns The TaskQueue associated with the given identifier, or undefined if none exists.
   */
  public get(id: T): TaskQueue | undefined {
    return this.queues.get(id)
  }

  /**
   * Get the task queue for the given identifier, creating it if it does not already exist.
   * @param id The identifier for the queue.
   * @param overrides Optional overrides for the default QueueOptions for this specific queue. Only used if the queue
   * did not already exist.
   * @returns The TaskQueue associated with the given identifier.
   */
  public getOrCreate(id: T, overrides: Partial<QueueOptions> = {}): TaskQueue {
    return this.get(id) ?? this.create(id, overrides)
  }

  /**
   * @returns A copy of the default queue options. Used primarily for testing and inspection.
   */
  public options(): Readonly<QueueOptions> {
    return {
      ...this.defaultOptions,
    }
  }
}
