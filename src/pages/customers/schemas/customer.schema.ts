import { z } from 'zod'
import type { Party } from '@/types/api.types'

/**
 * Customer form validation schema
 * Uses zod for type-safe runtime validation
 */
export const customerFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Customer name is required')
    .max(200, 'Customer name must be less than 200 characters')
    .trim(),

  contact_person: z
    .string()
    .max(100, 'Contact person must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .max(30, 'Phone number must be less than 30 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  state: z
    .string()
    .max(100, 'State must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  zip_code: z
    .string()
    .max(30, 'ZIP code must be less than 30 characters')
    .optional()
    .or(z.literal('')),

  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  tax_number: z
    .string()
    .max(100, 'Tax number must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  payment_terms: z
    .string()
    .max(50, 'Payment terms must be less than 50 characters')
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),

  is_active: z.boolean().default(true),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>

/**
 * Default form values for creating a new customer
 */
export const defaultCustomerFormValues: CustomerFormData = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  tax_number: '',
  payment_terms: '',
  notes: '',
  is_active: true,
}

/**
 * Convert Party (API response) to CustomerFormData
 */
export function partyToCustomerFormData(party: Party): CustomerFormData {
  return {
    name: party.name,
    contact_person: '',
    email: party.email || '',
    phone: party.phone || '',
    address: party.address || '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    tax_number: '',
    payment_terms: '',
    notes: '',
    is_active: true,
  }
}
