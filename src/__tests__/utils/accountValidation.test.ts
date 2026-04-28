import { describe, it, expect } from 'vitest'
import { validateAccountNumber } from '../../utils/accountValidation'

describe('validateAccountNumber', () => {
  it('returns true for a valid 18-digit account with allowed 111 prefix', () => {
    expect(validateAccountNumber('111000000000000008')).toBe(true)
  })

  it('returns true for a valid 18-digit account with allowed 333 prefix', () => {
    expect(validateAccountNumber('333000000000000002')).toBe(true)
  })

  it('returns true for a valid 18-digit account with allowed 444 prefix', () => {
    expect(validateAccountNumber('444000000000000019')).toBe(true)
  })

  it('returns false when account prefix is not allowed', () => {
    expect(validateAccountNumber('160000000000000002')).toBe(false)
  })

  it('returns false for 17-digit number (too short)', () => {
    expect(validateAccountNumber('12345678901234567')).toBe(false)
  })

  it('returns false for 19-digit number (too long)', () => {
    expect(validateAccountNumber('1234567890123456789')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(validateAccountNumber('')).toBe(false)
  })

  it('returns false for non-numeric 18-char string', () => {
    expect(validateAccountNumber('abcdefghijklmnopqr')).toBe(false)
  })

  it('returns false when value contains spaces instead of exact digits-only input', () => {
    expect(validateAccountNumber('3330 00140744023911')).toBe(false)
  })

  it('returns false for digits-only input with unsupported prefix', () => {
    expect(validateAccountNumber('999999999999999999')).toBe(false)
  })
})
