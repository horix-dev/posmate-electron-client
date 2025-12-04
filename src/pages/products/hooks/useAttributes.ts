/**
 * useAttributes Hook
 * 
 * Manages product attributes (Size, Color, Material, etc.) for variant products.
 * Fetches attributes from API and provides state management.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { attributesService } from '@/api/services'
import type { Attribute, AttributeValue, CreateAttributeRequest } from '@/types/variant.types'

// ============================================
// Types
// ============================================

interface UseAttributesReturn {
  /** All available attributes */
  attributes: Attribute[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refetch attributes */
  refetch: () => Promise<void>
  /** Create a new attribute */
  createAttribute: (data: CreateAttributeRequest) => Promise<Attribute | null>
  /** Get attribute by ID */
  getAttributeById: (id: number) => Attribute | undefined
  /** Get values for a specific attribute */
  getAttributeValues: (attributeId: number) => AttributeValue[]
}

// ============================================
// Hook
// ============================================

export function useAttributes(): UseAttributesReturn {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch all attributes
  const fetchAttributes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await attributesService.getAll()
      setAttributes(response.data || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch attributes')
      setError(error)
      console.error('Failed to fetch attributes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAttributes()
  }, [fetchAttributes])

  // Create new attribute
  const createAttribute = useCallback(async (data: CreateAttributeRequest): Promise<Attribute | null> => {
    try {
      const response = await attributesService.create(data)
      // Add to local state
      setAttributes((prev) => [...prev, response.data])
      toast.success(`Attribute "${data.name}" created`)
      return response.data
    } catch (err) {
      console.error('Failed to create attribute:', err)
      toast.error('Failed to create attribute')
      return null
    }
  }, [])

  // Get attribute by ID
  const getAttributeById = useCallback((id: number): Attribute | undefined => {
    return attributes.find((attr) => attr.id === id)
  }, [attributes])

  // Get values for an attribute
  const getAttributeValues = useCallback((attributeId: number): AttributeValue[] => {
    const attribute = attributes.find((attr) => attr.id === attributeId)
    return attribute?.values?.filter((v) => v.is_active) ?? []
  }, [attributes])

  return {
    attributes,
    isLoading,
    error,
    refetch: fetchAttributes,
    createAttribute,
    getAttributeById,
    getAttributeValues,
  }
}

export default useAttributes
