import { CancelReason } from './CancelReason'
import { PromiseWithResolvers } from './PromiseWithResolvers'
import { TaskRecord, type TaskOptions } from './TaskRecord'

export interface QueueOptions {
  /** The maximum number of tokens in the bucket controls the burst limit */
  burstLimit: number
  /** Rate at which tokens are added to the bucket (tokens per second) controls the sustained rate */
  sustainRate: number
  /** Initial number of tokens in the bucket (default to a full bucket) */
  startingTokens?: number
  /** Reject a task if it would cause the total queue cost to exceed this limit (default: no limit) */
  queueCostLimit?: number
  /** Number of tasks that can be processed concurrently (default: 1) */
  concurrency?: number
}

/**
 * Run tasks with rate and concurrency limits.
 * The rate limit is based on the token bucket algorithm. In this algorithm, a "bucket" holds a certain number of
 * tokens, which represent the capacity to perform work. The bucket gradually refills with tokens at a fixed rate, up
 * to a maximum capacity. Each task "costs" a certain number of tokens; if insufficient tokens are available, the task
 * must wait until enough tokens have accumulated.
 * In addition, a concurrency limit controls how many tasks can be run simultaneously. If the concurrency limit is
 * reached, additional tasks must wait until a running task completes even if there are enough tokens available.
 * @see {@link https://en.wikipedia.org/wiki/Token_bucket} for more information about the algorithm.
 */
export class TaskQueue {
  private readonly burstLimit: number
  private readonly sustainRate: number
  private readonly queueCostLimit: number
  private readonly concurrencyLimit: number
  private tokenCount: number

  private runningTasks = 0
  private pendingTaskRecords: TaskRecord<unknown>[] = []
  private lastRefillTime: number = Date.now()
  private onTaskAdded = PromiseWithResolvers<void>().resolve // start with a no-op of correct type
  private onTaskFinished = PromiseWithResolvers<void>().resolve // start with a no-op of correct type

  constructor(options: QueueOptions) {
    this.burstLimit = options.burstLimit
    this.sustainRate = options.sustainRate
    this.tokenCount = options.startingTokens ?? options.burstLimit
    this.queueCostLimit = options.queueCostLimit ?? Infinity
    this.concurrencyLimit = options.concurrency ?? 1
    void this.runTasks()
  }

  /** @returns The number of tasks currently in the queue */
  get length(): number {
    return this.pendingTaskRecords.length
  }

  /**
   * @returns The current configuration options of the queue. Used primarily for testing and inspection.
   * Note that the `startingTokens` value returned here reflects the current token count, which is only guaranteed to
   * match the originally configured starting tokens value if no time has passed and no tasks have been processed.
   */
  get options(): Readonly<QueueOptions> {
    return {
      burstLimit: this.burstLimit,
      sustainRate: this.sustainRate,
      startingTokens: this.tokenCount,
      queueCostLimit: this.queueCostLimit,
      concurrency: this.concurrencyLimit,
    }
  }

  /**
   * Adds a task to the queue. The task will first wait until enough tokens are available, then will wait its turn in
   * the concurrency queue.
   * @param task The task to be added to the queue.
   * @param taskOptions Options for queueing the task, such as the task cost.
   * @returns A promise for the task's result.
   */
  do<T>(task: () => T | Promise<T>, taskOptions: TaskOptions = {}): Promise<T> {
    const taskRecord = new TaskRecord<T>(task, taskOptions)

    if (taskRecord.cost > this.burstLimit) {
      return Promise.reject(new Error(CancelReason.TaskTooExpensive))
    }

    if (this.queueCostLimit < Infinity) {
      const proposedQueueCost = this.pendingTaskRecords.reduce((sum, record) => sum + record.cost, taskRecord.cost)
      if (proposedQueueCost > this.queueCostLimit) {
        return Promise.reject(new Error(CancelReason.QueueCostLimitExceeded))
      }
    }

    this.pendingTaskRecords.push(taskRecord)

    taskOptions.signal?.addEventListener('abort', () => {
      this.cancel(taskRecord.promise, new Error(CancelReason.Aborted))
    })

    this.onTaskAdded()

    return taskRecord.promise
  }

  /**
   * Cancel a task and remove it from the queue.
   * @param taskPromise - The promise of the task to cancel.
   * @param [reason] - The reason for cancellation.
   * @returns True if the task was found and cancelled, false otherwise.
   */
  cancel(taskPromise: Promise<unknown>, reason?: Error): boolean {
    const taskIndex = this.pendingTaskRecords.findIndex(record => record.promise === taskPromise)
    if (taskIndex !== -1) {
      const [taskRecord] = this.pendingTaskRecords.splice(taskIndex, 1)
      taskRecord.cancel(reason ?? new Error(CancelReason.Cancel))
      return true
    }
    return false
  }

  /**
   * Cancel all pending tasks and clear the queue.
   * @param [reason] - The reason for cancellation.
   * @returns The number of tasks that were cancelled.
   */
  cancelAll(reason?: Error): number {
    const oldTasks = this.pendingTaskRecords
    this.pendingTaskRecords = []
    reason = reason ?? new Error(CancelReason.Cancel)
    oldTasks.forEach(taskRecord => {
      taskRecord.cancel(reason)
    })
    return oldTasks.length
  }

  /**
   * Short-hand for calling refill() followed by spend().
   * @param cost The number of tokens to spend.
   * @returns True if the tokens were successfully spent, false otherwise.
   */
  private refillAndSpend(cost: number): boolean {
    this.refill()
    return this.spend(cost)
  }

  /**
   * Refill the token bucket based on the time elapsed since the last refill.
   */
  private refill(): void {
    const now = Date.now()
    const timeSinceRefill = now - this.lastRefillTime
    if (timeSinceRefill <= 0) {
      return
    }

    this.lastRefillTime = now
    const tokensToAdd = (timeSinceRefill / 1000) * this.sustainRate
    this.tokenCount = Math.min(this.burstLimit, this.tokenCount + tokensToAdd)
  }

  /**
   * Attempt to spend tokens from the bucket.
   * @param cost The number of tokens to spend.
   * @returns True if the tokens were successfully spent, false otherwise.
   */
  private spend(cost: number): boolean {
    if (this.tokenCount >= cost) {
      this.tokenCount -= cost
      return true
    }
    return false
  }

  /**
   * Run tasks from the queue as tokens become available.
   */
  private async runTasks(): Promise<void> {
    for (;;) {
      const nextRecord = this.pendingTaskRecords.shift()
      if (!nextRecord) {
        // No more tasks to run
        const { promise, resolve } = PromiseWithResolvers<void>()
        this.onTaskAdded = resolve
        await promise // wait until a task is added
        continue // then try again
      }

      if (nextRecord.cost > this.burstLimit) {
        // This should have been caught when the task was added
        nextRecord.cancel(new Error(CancelReason.TaskTooExpensive))
        continue
      }

      // Refill before each task in case the time it took for the last task to run was enough to afford the next.
      if (this.refillAndSpend(nextRecord.cost)) {
        if (this.runningTasks >= this.concurrencyLimit) {
          const { promise, resolve } = PromiseWithResolvers<void>()
          this.onTaskFinished = resolve
          await promise // wait until a task finishes
          // then we know there's room for at least one more task
        }
        void this.runTask(nextRecord)
      } else {
        // We can't currently afford this task. Put it back and wait until we can, then try again.
        this.pendingTaskRecords.unshift(nextRecord)
        const tokensNeeded = Math.max(nextRecord.cost - this.tokenCount, 0)
        const estimatedWait = Math.ceil((1000 * tokensNeeded) / this.sustainRate)
        await new Promise(resolve => setTimeout(resolve, estimatedWait))
      }
    }
  }

  /**
   * Run a task record right now, managing the running tasks count.
   * @param taskRecord The task that should run.
   */
  private async runTask(taskRecord: TaskRecord<unknown>): Promise<void> {
    this.runningTasks++
    try {
      await taskRecord.run()
    } finally {
      this.runningTasks--
      this.onTaskFinished()
    }
  }
}
