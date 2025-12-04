/**
 * Attribute Service
 * 
 * API operations for managing product attributes (Size, Color, Material, etc.)
 * Used for the variant product system.
 */

import api from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  Attribute,
  AttributeValue,
  CreateAttributeRequest,
  UpdateAttributeRequest,
  CreateAttributeValueRequest,
  UpdateAttributeValueRequest,
  AttributeListResponse,
  AttributeResponse,
  AttributeValueResponse,
} from '@/types/variant.types'

// ============================================
// Attribute Service
// ============================================

export const attributesService = {
  /**
   * Get all attributes with their values
   */
  getAll: async (): Promise<AttributeListResponse> => {
    const { data } = await api.get<AttributeListResponse>(API_ENDPOINTS.ATTRIBUTES.LIST)
    return data
  },

  /**
   * Get single attribute by ID
   */
  getById: async (id: number): Promise<AttributeResponse> => {
    const { data } = await api.get<AttributeResponse>(API_ENDPOINTS.ATTRIBUTES.GET(id))
    return data
  },

  /**
   * Create new attribute (optionally with values)
   */
  create: async (attributeData: CreateAttributeRequest): Promise<AttributeResponse> => {
    const { data } = await api.post<AttributeResponse>(
      API_ENDPOINTS.ATTRIBUTES.CREATE,
      attributeData
    )
    return data
  },

  /**
   * Update attribute
   */
  update: async (id: number, attributeData: UpdateAttributeRequest): Promise<AttributeResponse> => {
    const { data } = await api.put<AttributeResponse>(
      API_ENDPOINTS.ATTRIBUTES.UPDATE(id),
      attributeData
    )
    return data
  },

  /**
   * Delete attribute (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.ATTRIBUTES.DELETE(id))
  },

  /**
   * Add value to attribute
   */
  addValue: async (
    attributeId: number,
    valueData: CreateAttributeValueRequest
  ): Promise<AttributeValueResponse> => {
    const { data } = await api.post<AttributeValueResponse>(
      API_ENDPOINTS.ATTRIBUTES.ADD_VALUE(attributeId),
      valueData
    )
    return data
  },
}

// ============================================
// Attribute Value Service
// ============================================

export const attributeValuesService = {
  /**
   * Update attribute value
   */
  update: async (
    id: number,
    valueData: UpdateAttributeValueRequest
  ): Promise<AttributeValueResponse> => {
    const { data } = await api.put<AttributeValueResponse>(
      API_ENDPOINTS.ATTRIBUTE_VALUES.UPDATE(id),
      valueData
    )
    return data
  },

  /**
   * Delete attribute value (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.ATTRIBUTE_VALUES.DELETE(id))
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get display name for an attribute value
 */
export function getAttributeValueDisplayName(value: AttributeValue): string {
  return value.value
}

/**
 * Sort attributes by sort_order
 */
export function sortAttributes(attributes: Attribute[]): Attribute[] {
  return [...attributes].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Sort attribute values by sort_order
 */
export function sortAttributeValues(values: AttributeValue[]): AttributeValue[] {
  return [...values].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Get active attributes only
 */
export function getActiveAttributes(attributes: Attribute[]): Attribute[] {
  return attributes.filter((attr) => attr.is_active)
}

/**
 * Get active values for an attribute
 */
export function getActiveValues(attribute: Attribute): AttributeValue[] {
  return (attribute.values ?? []).filter((val) => val.is_active)
}
