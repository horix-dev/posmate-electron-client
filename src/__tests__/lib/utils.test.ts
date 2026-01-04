import { describe, it, expect } from 'vitest'
import { cn, getImageUrl } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-500')
  })

  it('should handle conditional classes', () => {
    const result = cn('base-class', false && 'conditional-class', 'always-class')
    expect(result).toContain('base-class')
    expect(result).toContain('always-class')
    expect(result).not.toContain('conditional-class')
  })

  it('should handle tailwind merge conflicts', () => {
    const result = cn('p-4', 'p-2')
    // tailwind-merge should keep only the last padding class
    expect(result).toBe('p-2')
  })

  it('should handle arrays and objects', () => {
    const result = cn(['class1', 'class2'], { class3: true, class4: false })
    expect(result).toContain('class1')
    expect(result).toContain('class2')
    expect(result).toContain('class3')
    expect(result).not.toContain('class4')
  })

  it('should handle undefined and null values', () => {
    const result = cn('valid-class', undefined, null, 'another-class')
    expect(result).toContain('valid-class')
    expect(result).toContain('another-class')
  })
})

describe('getImageUrl', () => {
  // Note: Cannot easily mock import.meta.env in Vitest, so we test with actual env value

  it('should return null for undefined path', () => {
    expect(getImageUrl(undefined)).toBeNull()
  })

  it('should return null for null path', () => {
    expect(getImageUrl(null)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(getImageUrl('')).toBeNull()
  })

  it('should return absolute URL as-is when path starts with http://', () => {
    const url = 'http://example.com/image.jpg'
    expect(getImageUrl(url)).toBe(url)
  })

  it('should return absolute URL as-is when path starts with https://', () => {
    const url = 'https://example.com/image.jpg'
    expect(getImageUrl(url)).toBe(url)
  })

  it('should convert relative path with leading slash to absolute URL', () => {
    const path = '/uploads/products/image.jpg'
    const result = getImageUrl(path)
    expect(result).toContain('/uploads/products/image.jpg')
    expect(result).toMatch(/^https?:\/\//)
  })

  it('should convert relative path without leading slash to absolute URL', () => {
    const path = 'uploads/products/image.jpg'
    const result = getImageUrl(path)
    expect(result).toContain('/uploads/products/image.jpg')
    expect(result).toMatch(/^https?:\/\//)
  })

  it('should handle paths with query parameters', () => {
    const path = '/uploads/image.jpg?size=large'
    const result = getImageUrl(path)
    expect(result).toContain('/uploads/image.jpg?size=large')
    expect(result).toMatch(/^https?:\/\//)
  })

  it('should use default API URL when env var not set', () => {
    delete import.meta.env.VITE_API_BASE_URL
    const path = '/uploads/image.jpg'
    expect(getImageUrl(path)).toBe('https://api.posmate.app/uploads/image.jpg')
  })
})
