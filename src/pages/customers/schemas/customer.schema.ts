import { z } from 'zod'
import type { Party } from '@/types/api.types'

/**
 * Customer form validation schema
 * Uses zod for type-safe runtime validation
 * Matches backend Party API requirements
 */
export const customerFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Customer name is required')
    .max(255, 'Customer name must be less than 255 characters')
    .trim(),

  type: z.enum(['Retailer', 'Dealer', 'Wholesaler'], {
    errorMap: () => ({ message: 'Please select a customer type' }),
  }),

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

  credit_limit: z
    .number()
    .min(0, 'Credit limit must be positive')
    .max(999999999999.99, 'Credit limit too large')
    .optional()
    .or(z.nan()),

  opening_balance: z.number().optional().or(z.nan()),

  opening_balance_type: z.enum(['due', 'advance'], {
    errorMap: () => ({ message: 'Please select balance type' }),
  }),

  image: z.instanceof(File).optional(),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>

/**
 * Default form values for creating a new customer
 */
export const defaultCustomerFormValues: CustomerFormData = {
  name: '',
  type: 'Retailer',
  email: '',
  phone: '',
  address: '',
  credit_limit: undefined,
  opening_balance: 0,
  opening_balance_type: 'due',
  image: undefined,
}

/**
 * Convert Party (API response) to CustomerFormData
 */
export function partyToCustomerFormData(party: Party): CustomerFormData {
  return {
    name: party.name,
    type: party.type as 'Retailer' | 'Dealer' | 'Wholesaler',
    email: party.email || '',
    phone: party.phone || '',
    address: party.address || '',
    credit_limit: party.credit_limit,
    opening_balance: party.opening_balance,
    opening_balance_type: party.opening_balance_type,
    image: undefined,
  }
}
