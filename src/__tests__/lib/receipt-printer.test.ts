import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { printReceipt, printReceiptWithFeedback } from '@/lib/receipt-printer'
import type { Sale } from '@/types/api.types'

// Mock window.electronAPI
const mockElectronAPI = {
  print: {
    receipt: vi.fn(),
  },
}

describe('printReceipt', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock window.open
    windowOpenSpy = vi.spyOn(window, 'open')
    
    // Mock console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Remove electron API by default
    delete (window as any).electronAPI
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('when invoice_url is missing', () => {
    it('should return false and log warning', async () => {
      const sale = { id: 1 } as Sale

      const result = await printReceipt(sale)

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot print receipt: invoice_url is missing from sale response'
      )
    })
  })

  describe('in Electron environment', () => {
    beforeEach(() => {
      // Mock Electron environment
      ;(window as any).electronAPI = mockElectronAPI
    })

    it('should use Electron silent printing when available', async () => {
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      mockElectronAPI.print.receipt.mockResolvedValue({ success: true })

      const result = await printReceipt(sale)

      expect(result).toBe(true)
      expect(mockElectronAPI.print.receipt).toHaveBeenCalledWith(sale.invoice_url)
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('should return false when Electron printing fails', async () => {
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      mockElectronAPI.print.receipt.mockResolvedValue({ success: false })

      const result = await printReceipt(sale)

      expect(result).toBe(false)
      expect(mockElectronAPI.print.receipt).toHaveBeenCalledWith(sale.invoice_url)
    })

    it('should handle Electron API errors', async () => {
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      const error = new Error('Print failed')
      mockElectronAPI.print.receipt.mockRejectedValue(error)

      const result = await printReceipt(sale)

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error printing receipt:', error)
    })
  })

  describe('in browser environment', () => {
    it('should use window.open for printing', async () => {
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      const mockWindow = {
        onload: null as (() => void) | null,
        print: vi.fn(),
      }
      windowOpenSpy.mockReturnValue(mockWindow as any)

      const result = await printReceipt(sale)

      expect(result).toBe(true)
      expect(windowOpenSpy).toHaveBeenCalledWith(
        sale.invoice_url,
        '_blank',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )
    })

    it('should return false when window.open is blocked', async () => {
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      windowOpenSpy.mockReturnValue(null)

      const result = await printReceipt(sale)

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to open print window. Popup might be blocked.'
      )
    })

    it('should trigger print after window loads', async () => {
      vi.useFakeTimers()
      
      const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
      const mockWindow = {
        onload: null as (() => void) | null,
        print: vi.fn(),
      }
      windowOpenSpy.mockReturnValue(mockWindow as any)

      await printReceipt(sale)

      // Simulate window load
      expect(mockWindow.onload).toBeTypeOf('function')
      mockWindow.onload!()
      
      // Fast-forward timer
      vi.advanceTimersByTime(500)

      expect(mockWindow.print).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })
})

describe('printReceiptWithFeedback', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    windowOpenSpy = vi.spyOn(window, 'open')
    delete (window as any).electronAPI
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    windowOpenSpy.mockRestore()
  })

  it('should call onError when invoice_url is missing', async () => {
    const sale = { id: 1 } as Sale
    const onError = vi.fn()

    await printReceiptWithFeedback(sale, undefined, onError)

    expect(onError).toHaveBeenCalledWith('Cannot print receipt: Invoice URL not available')
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  it('should call onSuccess when print succeeds', async () => {
    const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
    const onSuccess = vi.fn()
    const mockWindow = { onload: null, print: vi.fn() }
    windowOpenSpy.mockReturnValue(mockWindow as any)

    await printReceiptWithFeedback(sale, onSuccess)

    expect(onSuccess).toHaveBeenCalled()
  })

  it('should call onError when print fails', async () => {
    const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
    const onError = vi.fn()
    windowOpenSpy.mockReturnValue(null)

    await printReceiptWithFeedback(sale, undefined, onError)

    expect(onError).toHaveBeenCalledWith(
      'Failed to open print window. Please check your popup blocker settings.'
    )
  })

  it('should work without callbacks', async () => {
    const sale = { id: 1, invoice_url: 'https://example.com/invoice/123' } as Sale
    const mockWindow = { onload: null, print: vi.fn() }
    windowOpenSpy.mockReturnValue(mockWindow as any)

    await expect(printReceiptWithFeedback(sale)).resolves.not.toThrow()
  })
})
