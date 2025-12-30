import { describe, expect, it } from 'vitest'
import { QueueManager } from '../src/QueueManager'
import { TaskQueue } from '../src/TaskQueue'

// This suite verifies QueueManager's API without executing queue tasks.

describe('QueueManager', () => {
  describe('constructor', () => {
    it('should create a manager with default options', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 3,
      })
      expect(manager).toBeInstanceOf(QueueManager)

      const options = manager.options()
      expect(options).toEqual({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 3,
      })
    })

    it('should accept an iterable of existing queues', () => {
      const existingQueue = new TaskQueue({
        burstLimit: 10,
        sustainRate: 100,
      })
      const manager = new QueueManager({ burstLimit: 5, sustainRate: 50 }, [['existing', existingQueue]])
      const retrieved = manager.get('existing')
      expect(retrieved).toBe(existingQueue)
      expect(retrieved?.options).toEqual({
        burstLimit: 10,
        concurrency: 1,
        queueCostLimit: Infinity,
        startingTokens: 10,
        sustainRate: 100,
      })
    })
  })

  describe('create()', () => {
    it('should create a queue with default options when no overrides given', () => {
      const manager = new QueueManager({
        burstLimit: 2,
        sustainRate: 1000,
        startingTokens: 1,
        concurrency: 1,
      })

      const queue = manager.create('test')
      expect(queue).toBeInstanceOf(TaskQueue)
      expect(queue.options).toEqual({
        burstLimit: 2,
        sustainRate: 1000,
        startingTokens: 1,
        queueCostLimit: Infinity,
        concurrency: 1,
      })
    })

    it('should override default options when overrides are provided', () => {
      const manager = new QueueManager({
        burstLimit: 2,
        sustainRate: 1000,
        startingTokens: 1,
      })

      // Override startingTokens to 5 and allow two concurrent tasks
      const queue = manager.create('test', { startingTokens: 5, concurrency: 2 })
      expect(queue.options).toEqual({
        burstLimit: 2,
        sustainRate: 1000,
        startingTokens: 5,
        queueCostLimit: Infinity,
        concurrency: 2,
      })
    })

    it('should replace an existing queue with the same id', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
      })

      const queue1 = manager.create('test')
      // Create a new queue with the same id - should replace
      const queue2 = manager.create('test')
      expect(queue2).not.toBe(queue1)
      expect(manager.get('test')).toBe(queue2)
    })
  })

  describe('get()', () => {
    it('should return a queue that was created', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 100,
      })

      const created = manager.create('test')
      const retrieved = manager.get('test')

      expect(retrieved).toBe(created)
    })

    it('should return undefined for a non-existent queue', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 100,
      })

      const result = manager.get('nonExistent')
      expect(result).toBeUndefined()
    })

    it('should work with non-string keys', () => {
      const manager = new QueueManager<number>({
        burstLimit: 5,
        sustainRate: 100,
      })

      const queue = manager.create(42)
      const retrieved = manager.get(42)
      expect(retrieved).toBe(queue)
    })
  })

  describe('getOrCreate()', () => {
    it('should return existing queue if one exists', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 3,
      })

      const queue1 = manager.create('test')
      // getOrCreate should return the same queue
      const queue2 = manager.getOrCreate('test', { startingTokens: 10 })
      expect(queue2).toBe(queue1)
    })

    it('should create new queue with default options if it does not exist', () => {
      const manager = new QueueManager({
        burstLimit: 3,
        sustainRate: 1000,
        startingTokens: 2,
        concurrency: 2,
      })

      const queue = manager.getOrCreate('test')
      expect(queue.options).toEqual({
        burstLimit: 3,
        sustainRate: 1000,
        startingTokens: 2,
        queueCostLimit: Infinity,
        concurrency: 2,
      })
    })

    it('should create new queue with overrides if it does not exist', () => {
      const manager = new QueueManager({
        burstLimit: 3,
        sustainRate: 1000,
        startingTokens: 0,
      })

      // Override to give 10 starting tokens and allow two concurrent tasks
      const queue = manager.getOrCreate('test', { startingTokens: 10, concurrency: 2 })
      expect(queue.options).toEqual({
        burstLimit: 3,
        sustainRate: 1000,
        startingTokens: 10,
        queueCostLimit: Infinity,
        concurrency: 2,
      })
    })

    it('should ignore overrides if queue already exists', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 1,
        concurrency: 1,
      })

      const queue1 = manager.create('test')
      // getOrCreate with different overrides should return existing queue
      const queue2 = manager.getOrCreate('test', { startingTokens: 10 })
      expect(queue2).toBe(queue1)
      // Options should still match original queue (startingTokens=1)
      expect(queue1.options.startingTokens).toBe(1)
    })
  })

  describe('multiple queues', () => {
    it('should manage multiple independent queues', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 2,
        concurrency: 2,
      })

      const queue1 = manager.create('queue1')
      const queue2 = manager.create('queue2')
      expect(queue1.options).toEqual({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 2,
        queueCostLimit: Infinity,
        concurrency: 2,
      })
      expect(queue2.options).toEqual({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 2,
        queueCostLimit: Infinity,
        concurrency: 2,
      })
      expect(queue1).not.toBe(queue2)
    })

    it('should allow different overrides per queue', () => {
      const manager = new QueueManager({
        burstLimit: 5,
        sustainRate: 1000,
        startingTokens: 1,
        concurrency: 1,
      })

      const queue1 = manager.create('queue1', { startingTokens: 0 })
      const queue2 = manager.create('queue2', { startingTokens: 5 })
      expect(queue1.options.startingTokens).toBe(0)
      expect(queue2.options.startingTokens).toBe(5)
    })
  })
})
