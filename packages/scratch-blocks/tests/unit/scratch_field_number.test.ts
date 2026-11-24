/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { beforeAll, describe, expect, it } from 'vitest'
import { registerScratchFieldNumber } from '../../src/fields/scratch_field_number'

// ScratchFieldNumber is not exported directly; access it through the registry.
interface AnyField {
  decimalAllowed_: boolean
  negativeAllowed_: boolean
  exponentialAllowed_: boolean
  getNumRestrictor(): RegExp
  configure_(config: Record<string, unknown>): void
}

function makeField(config: Record<string, unknown> = {}): AnyField {
  // Create via the registry (gets a properly initialised instance), then call
  // configure_() manually so our config is applied AFTER class field
  // initialisers have run (which reset the boolean flags back to their
  // defaults). This is equivalent to the original new FieldClass() pattern.
  const field = Blockly.fieldRegistry.TEST_ONLY.fromJsonInternal({
    type: 'field_number',
  }) as AnyField
  field.configure_(config)
  return field
}

describe('ScratchFieldNumber', () => {
  beforeAll(() => {
    registerScratchFieldNumber()
  })

  describe('configure_', () => {
    it('allows decimals by default (no precision)', () => {
      const field = makeField({})
      expect(field.decimalAllowed_).toBe(true)
    })

    it('allows decimals when precision is 0', () => {
      const field = makeField({ precision: 0 })
      expect(field.decimalAllowed_).toBe(true)
    })

    it('allows decimals when precision is non-integer (0.5)', () => {
      const field = makeField({ precision: 0.5 })
      expect(field.decimalAllowed_).toBe(true)
    })

    it('disallows decimals when precision is a positive integer', () => {
      const field = makeField({ precision: 1 })
      expect(field.decimalAllowed_).toBe(false)
    })

    it('allows negatives by default (no min)', () => {
      const field = makeField({})
      expect(field.negativeAllowed_).toBe(true)
    })

    it('allows negatives when min is negative', () => {
      const field = makeField({ min: -10 })
      expect(field.negativeAllowed_).toBe(true)
    })

    it('disallows negatives when min is 0', () => {
      const field = makeField({ min: 0 })
      expect(field.negativeAllowed_).toBe(false)
    })

    it('disallows negatives when min is positive', () => {
      const field = makeField({ min: 1 })
      expect(field.negativeAllowed_).toBe(false)
    })

    it('sets exponentialAllowed_ to match decimalAllowed_', () => {
      const decimal = makeField({ precision: 0.5 })
      expect(decimal.exponentialAllowed_).toBe(true)

      const integer = makeField({ precision: 1 })
      expect(integer.exponentialAllowed_).toBe(false)
    })
  })

  describe('getNumRestrictor', () => {
    it('always allows digits', () => {
      const field = makeField({ min: 0, precision: 1 })
      const re = field.getNumRestrictor()
      expect('7').toMatch(re)
      expect('0').toMatch(re)
    })

    it('allows decimal point when decimalAllowed_', () => {
      const field = makeField({})
      expect(field.decimalAllowed_).toBe(true)
      expect('.').toMatch(field.getNumRestrictor())
    })

    it('disallows decimal point when !decimalAllowed_', () => {
      const field = makeField({ precision: 1 })
      expect(field.decimalAllowed_).toBe(false)
      expect('.').not.toMatch(field.getNumRestrictor())
    })

    it('allows minus sign when negativeAllowed_', () => {
      const field = makeField({})
      expect(field.negativeAllowed_).toBe(true)
      expect('-').toMatch(field.getNumRestrictor())
    })

    it('disallows minus sign when !negativeAllowed_', () => {
      const field = makeField({ min: 0 })
      expect(field.negativeAllowed_).toBe(false)
      expect('-').not.toMatch(field.getNumRestrictor())
    })

    it('allows "e" and "E" when exponentialAllowed_', () => {
      const field = makeField({})
      expect(field.exponentialAllowed_).toBe(true)
      const re = field.getNumRestrictor()
      expect('e').toMatch(re)
      expect('E').toMatch(re)
    })

    it('disallows "e" and "E" when !exponentialAllowed_', () => {
      const field = makeField({ precision: 1 })
      expect(field.exponentialAllowed_).toBe(false)
      const re = field.getNumRestrictor()
      expect('e').not.toMatch(re)
      expect('E').not.toMatch(re)
    })
  })
})
