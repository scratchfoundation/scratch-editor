/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest'
import { compareStrings } from '../../src/scratch_blocks_utils'

describe('compareStrings', () => {
  describe('numeric sorting', () => {
    it('sorts "name2" before "name10" (natural number order)', () => {
      expect(compareStrings('name2', 'name10')).toBeLessThan(0)
    })

    it('sorts "name10" after "name2"', () => {
      expect(compareStrings('name10', 'name2')).toBeGreaterThan(0)
    })

    it('treats equal strings as equal', () => {
      expect(compareStrings('name1', 'name1')).toBe(0)
    })

    it('sorts bare numbers naturally', () => {
      expect(compareStrings('9', '10')).toBeLessThan(0)
    })
  })

  describe('case insensitivity', () => {
    it('treats uppercase and lowercase as equal', () => {
      expect(compareStrings('ABC', 'abc')).toBe(0)
    })

    it('treats mixed case as equal', () => {
      expect(compareStrings('Foo', 'foo')).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty strings as equal', () => {
      expect(compareStrings('', '')).toBe(0)
    })

    it('sorts empty string before non-empty', () => {
      expect(compareStrings('', 'a')).toBeLessThan(0)
    })

    it('handles strings with only digits', () => {
      expect(compareStrings('2', '10')).toBeLessThan(0)
    })

    it('handles strings with special characters', () => {
      // Just ensure it does not throw
      expect(() => compareStrings('a-b', 'a_b')).not.toThrow()
    })
  })
})
