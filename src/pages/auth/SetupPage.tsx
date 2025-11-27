import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ShoppingCart, Loader2, Building2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore, useBusinessStore } from '@/stores'
import { businessService } from '@/api/services'
import { getApiErrorMessage } from '@/api/axios'
import { toast } from 'sonner'
import type { BusinessCategory } from '@/types/api.types'
import { useEffect } from 'react'

const setupSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  category_id: z.string().optional(),
})

type SetupFormData = z.infer<typeof setupSchema>

export function SetupPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const { setIsSetupComplete } = useAuthStore()
  const { setBusiness } = useBusinessStore()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      companyName: '',
      phoneNumber: '',
      address: '',
    },
  })

  // Fetch business categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await businessService.getBusinessCategories()
        setCategories(response.data)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: SetupFormData) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('companyName', data.companyName)
      if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber)
      if (data.address) formData.append('address', data.address)
      if (data.category_id) formData.append('category_id', data.category_id)
      if (logoFile) formData.append('pictureUrl', logoFile)

      const response = await businessService.createBusiness(formData)

      setBusiness(response.data)
      setIsSetupComplete(true)

      toast.success('Business setup completed!')
      navigate('/')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Set up your business</CardTitle>
          <CardDescription>
            Tell us about your business to get started with POS Mate
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/50 bg-muted">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="logo" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {logoPreview ? 'Change logo' : 'Upload logo'}
                  </div>
                </Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Enter your business name"
                {...register('companyName')}
                disabled={isSubmitting}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            {/* Business Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select
                onValueChange={(value) => setValue('category_id', value)}
                disabled={isLoadingCategories || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter your phone number"
                {...register('phoneNumber')}
                disabled={isSubmitting}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Enter your business address"
                {...register('address')}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default SetupPage
