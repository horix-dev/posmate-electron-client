import { z } from 'zod'
import type { Party } from '@/types/api.types'

/**
 * Supplier form validation schema
 * Uses zod for type-safe runtime validation
 * Matches backend Party API requirements
 */
export const supplierFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Supplier name is required')
    .max(255, 'Supplier name must be less than 255 characters')
    .trim(),

  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(255, 'Address must be less than 255 characters')
    .optional()
    .or(z.literal('')),

  opening_balance: z.number().optional().or(z.nan()),

  opening_balance_type: z.enum(['due', 'advance'], {
    errorMap: () => ({ message: 'Please select balance type' }),
  }),

  image: z.instanceof(File).optional(),
})

export type SupplierFormData = z.infer<typeof supplierFormSchema>

/**
 * Default form values for creating a new supplier
 */
export const defaultSupplierFormValues: SupplierFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  opening_balance: 0,
  opening_balance_type: 'advance',
  image: undefined,
}

/**
 * Convert Party (API response) to SupplierFormData
 */
export function partyToSupplierFormData(party: Party): SupplierFormData {
  return {
    name: party.name,
    email: party.email || '',
    phone: party.phone || '',
    address: party.address || '',
    opening_balance: party.opening_balance,
    opening_balance_type: party.opening_balance_type,
    image: undefined,
  }
}
