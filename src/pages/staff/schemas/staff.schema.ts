import { z } from 'zod'
import type { StaffMember, StaffVisibility } from '@/types/api.types'

const DEFAULT_VISIBILITY = {
  sales: { view: '1' as const, create: '1' as const, delete: '0' as const },
  products: { view: '1' as const, create: '0' as const },
  parties: { view: '1' as const, create: '0' as const },
  purchases: { view: '0' as const, create: '0' as const },
  reports: { view: '1' as const },
  stock_adjustments: { view: '1' as const, create: '0' as const },
}

function parseVisibility(raw: StaffVisibility | string | undefined) {
  if (!raw) return DEFAULT_VISIBILITY
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as StaffVisibility
      // Merge with defaults to ensure all modules exist
      return {
        sales: parsed.sales || {},
        products: parsed.products || {},
        parties: parsed.parties || {},
        purchases: parsed.purchases || {},
        reports: parsed.reports || {},
        stock_adjustments: parsed.stock_adjustments || {},
      }
    } catch {
      return DEFAULT_VISIBILITY
    }
  }
  // Ensure all modules exist even if raw is a partial object
  return {
    sales: raw.sales || {},
    products: raw.products || {},
    parties: raw.parties || {},
    purchases: raw.purchases || {},
    reports: raw.reports || {},
    stock_adjustments: raw.stock_adjustments || {},
  }
}

const visibilityModuleSchema = z
  .object({
    view: z.enum(['0', '1']).optional(),
    create: z.enum(['0', '1']).optional(),
    delete: z.enum(['0', '1']).optional(),
  })
  .optional()
  .default({})

export const staffFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(30, 'Name must be less than 30 characters')
    .trim(),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),

  password: z
    .string()
    .transform((val) => val || '')
    .refine((val) => !val || (val.length >= 4 && val.length <= 15), {
      message: 'Password must be between 4 and 15 characters (or leave blank)',
    }),

  branch_id: z.number().nullish(),

  visibility: z
    .object({
      sales: visibilityModuleSchema,
      products: visibilityModuleSchema,
      parties: visibilityModuleSchema,
      purchases: visibilityModuleSchema,
      reports: visibilityModuleSchema,
      stock_adjustments: visibilityModuleSchema,
    })
    .default(DEFAULT_VISIBILITY),
})

export type StaffFormData = z.infer<typeof staffFormSchema>

export const defaultStaffFormValues: StaffFormData = {
  name: '',
  email: '',
  password: '',
  branch_id: undefined,
  visibility: DEFAULT_VISIBILITY,
}

export function staffMemberToFormData(member: StaffMember): StaffFormData {
  return {
    name: member.name,
    email: member.email,
    password: '',
    branch_id: member.branch_id,
    visibility: parseVisibility(member.visibility),
  }
}
