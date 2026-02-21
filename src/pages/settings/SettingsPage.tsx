import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Receipt,
  Bell,
  Palette,
  Lock,
  Users,
  Tag,
  RefreshCw,
  Download,
  // DollarSign,
  Info,
  Search,
  Trash2,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUIStore } from '@/stores'
import { useAuthStore } from '@/stores/auth.store'
import { useAppUpdater } from '@/hooks/useAppUpdater'
import { useQueryClient } from '@tanstack/react-query'
import { CurrencySettings, BusinessSettingsForm } from './components'
import { PaymentTypesTable } from '@/pages/product-settings/components/payment-types/PaymentTypesTable'
import { PaymentTypeDialog } from '@/pages/product-settings/components/payment-types/PaymentTypeDialog'
import { clearAllCache, getCacheStats } from '@/lib/cache/clearCache'
import { loyaltyService } from '@/api/services/loyalty.service'
import type { LoyaltySettings, PaymentType } from '@/types/api.types'

const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: false,
  earn_mode: 'amount_based',
  earn_value: 100,
  minimum_sale_amount: 0,
  exclude_due_sales: false,
  exclude_discounted_amount: false,
  redeem_enabled: true,
  redeem_mode: 'points_to_currency',
  point_value: 1,
  min_points_to_redeem: 0,
  max_redeem_percent_of_bill: 100,
  allow_partial_redeem: true,
  rounding_rule: 'floor',
  expiry_enabled: false,
  expiry_days: null,
  meta: null,
}

function normalizeLoyaltySettings(settings: LoyaltySettings): LoyaltySettings {
  return {
    ...settings,
    meta: settings.meta ?? null,
    expiry_days: settings.expiry_enabled ? settings.expiry_days ?? 30 : null,
  }
}

type AppInfo = {
  name: string
  version: string
  platform: string
}

type PrinterInfo = {
  name: string
  displayName?: string
  description?: string
  status?: number
  isDefault?: boolean
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const {
    theme,
    setTheme,
    soundEnabled,
    setSoundEnabled,
    autoPrintReceipt,
    setAutoPrintReceipt,
    receiptPrinterName,
    setReceiptPrinterName,
    labelPrinterName,
    setLabelPrinterName,
    smartTenderEnabled,
    setSmartTenderEnabled,
  } = useUIStore()

  const queryClient = useQueryClient()

  const {
    updateStatus,
    updateInfo,
    downloadProgress,
    error: updateError,
    isChecking,
    isUpdateAvailable,
    isDownloading,
    isUpdateReady,
    hasError,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useAppUpdater()

  const [manualUpdateCheckRequested, setManualUpdateCheckRequested] = useState(false)
  const supportsUpdater = Boolean(window.electronAPI?.updater?.checkForUpdates)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  // Payment types state
  const [isPaymentTypeOpen, setIsPaymentTypeOpen] = useState(false)
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Loyalty settings state
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS)
  const [initialLoyaltySettings, setInitialLoyaltySettings] =
    useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS)
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false)
  const [isLoyaltySaving, setIsLoyaltySaving] = useState(false)
  const [loyaltyFieldErrors, setLoyaltyFieldErrors] = useState<Record<string, string[]>>({})

  // Cache management state
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [cacheStats, setCacheStats] = useState<{
    localStorage: number
    products: number
    categories: number
    offlineSales: number
    syncQueue: number
    images: number
  } | null>(null)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false)
  const hasPrinterApi = Boolean(window.electronAPI?.print?.getPrinters)
  const canEditLoyaltySettings = user?.role === 'shop-owner'

  const refresh = () => setRefreshTrigger((prev) => prev + 1)
  const DEFAULT_PRINTER_VALUE = '__system_default__'

  const handleReceiptPrinterChange = (value: string) => {
    setReceiptPrinterName(value === DEFAULT_PRINTER_VALUE ? null : value)
  }

  const handleLabelPrinterChange = (value: string) => {
    setLabelPrinterName(value === DEFAULT_PRINTER_VALUE ? null : value)
  }

  const receiptPrinterValue = receiptPrinterName ?? DEFAULT_PRINTER_VALUE
  const labelPrinterValue = labelPrinterName ?? DEFAULT_PRINTER_VALUE

  const loadPrinters = useCallback(async () => {
    if (!hasPrinterApi) {
      setPrinters([])
      return
    }

    setIsLoadingPrinters(true)
    try {
      const list = await window.electronAPI?.print?.getPrinters?.()
      if (list) {
        setPrinters(list)
      } else {
        setPrinters([])
      }
    } catch (error) {
      console.error('Failed to load printers:', error)
      toast.error('Unable to load printers')
    } finally {
      setIsLoadingPrinters(false)
    }
  }, [hasPrinterApi])

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const info = await window.electronAPI?.getAppInfo?.()
        if (info) {
          setAppInfo({
            name: info.name,
            version: info.version,
            platform: info.platform,
          })
        }
      } catch (error) {
        console.error('Failed to load app info:', error)
      }
    }
    loadAppInfo()
  }, [])

  // Load cache stats
  useEffect(() => {
    const loadCacheStats = async () => {
      try {
        const stats = await getCacheStats()
        setCacheStats(stats)
      } catch (error) {
        console.error('Failed to load cache stats:', error)
      }
    }
    loadCacheStats()
  }, [])

  useEffect(() => {
    if (!hasPrinterApi) {
      return
    }

    loadPrinters()
  }, [hasPrinterApi, loadPrinters])

  const handleClearCache = async () => {
    if (
      !window.confirm(
        'This will clear all cached data including products, categories, and offline sales. The app will reload and fetch fresh data. Continue?'
      )
    ) {
      return
    }

    setIsClearingCache(true)
    try {
      await clearAllCache(queryClient, { all: true })
      toast.success('Cache cleared successfully')
      // Reload stats
      const stats = await getCacheStats()
      setCacheStats(stats)
      // Reload page to fetch fresh data
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      toast.error('Failed to clear cache. Some data may remain.')
    } finally {
      setIsClearingCache(false)
    }
  }

  const loadLoyaltySettings = useCallback(async () => {
    setIsLoyaltyLoading(true)
    try {
      const response = await loyaltyService.getSettings()
      const merged = {
        ...DEFAULT_LOYALTY_SETTINGS,
        ...response.data,
      }
      setLoyaltySettings(merged)
      setInitialLoyaltySettings(merged)
      setLoyaltyFieldErrors({})
    } catch (error) {
      console.error('Failed to load loyalty settings:', error)
      toast.error('Failed to load loyalty settings')
    } finally {
      setIsLoyaltyLoading(false)
    }
  }, [])

  const handleLoyaltyNumberChange = useCallback(
    (field: keyof LoyaltySettings, value: string) => {
      const parsed = value === '' ? 0 : Number(value)
      setLoyaltySettings((prev) => ({
        ...prev,
        [field]: Number.isFinite(parsed) ? parsed : 0,
      }))
      setLoyaltyFieldErrors((prev) => {
        if (!prev[field]) return prev
        const next = { ...prev }
        delete next[field]
        return next
      })
    },
    []
  )

  const clearLoyaltyFieldError = useCallback((field: keyof LoyaltySettings | string) => {
    setLoyaltyFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const loyaltyLocalErrors = useMemo<Record<string, string[]>>(() => {
    const errors: Record<string, string[]> = {}

    if (loyaltySettings.earn_value < 0) {
      errors.earn_value = ['Earn value must be 0 or greater.']
    }

    if (loyaltySettings.minimum_sale_amount < 0) {
      errors.minimum_sale_amount = ['Minimum sale amount must be 0 or greater.']
    }

    if (loyaltySettings.point_value < 0) {
      errors.point_value = ['Point value must be 0 or greater.']
    }

    if (loyaltySettings.min_points_to_redeem < 0) {
      errors.min_points_to_redeem = ['Minimum points to redeem must be 0 or greater.']
    }

    if (
      loyaltySettings.max_redeem_percent_of_bill < 0 ||
      loyaltySettings.max_redeem_percent_of_bill > 100
    ) {
      errors.max_redeem_percent_of_bill = ['Max redeem percent must be between 0 and 100.']
    }

    if (loyaltySettings.expiry_enabled && (!loyaltySettings.expiry_days || loyaltySettings.expiry_days <= 0)) {
      errors.expiry_days = ['Expiry days must be greater than 0 when expiry is enabled.']
    }

    return errors
  }, [loyaltySettings])

  const isLoyaltyFormInvalid = Object.keys(loyaltyLocalErrors).length > 0

  const isLoyaltyDirty = useMemo(() => {
    const current = normalizeLoyaltySettings(loyaltySettings)
    const initial = normalizeLoyaltySettings(initialLoyaltySettings)
    return JSON.stringify(current) !== JSON.stringify(initial)
  }, [initialLoyaltySettings, loyaltySettings])

  const getLoyaltyFieldError = useCallback(
    (field: keyof LoyaltySettings | string) => {
      return loyaltyFieldErrors[field]?.[0] || loyaltyLocalErrors[field]?.[0] || null
    },
    [loyaltyFieldErrors, loyaltyLocalErrors]
  )

  const handleSaveLoyaltySettings = useCallback(async () => {
    if (Object.keys(loyaltyLocalErrors).length > 0) {
      setLoyaltyFieldErrors(loyaltyLocalErrors)
      const firstError = Object.values(loyaltyLocalErrors)[0]?.[0]
      if (firstError) {
        toast.error(firstError)
      }
      return
    }

    setIsLoyaltySaving(true)
    try {
      const response = await loyaltyService.updateSettings(loyaltySettings)
      const merged = {
        ...DEFAULT_LOYALTY_SETTINGS,
        ...response.data,
      }
      setLoyaltySettings(merged)
      setInitialLoyaltySettings(merged)
      setLoyaltyFieldErrors({})
      toast.success('Loyalty settings updated successfully')
    } catch (error) {
      console.error('Failed to save loyalty settings:', error)

      if (axios.isAxiosError(error)) {
        const apiErrors = (error.response?.data as { errors?: Record<string, string[]> } | undefined)
          ?.errors

        if (apiErrors && Object.keys(apiErrors).length > 0) {
          setLoyaltyFieldErrors(apiErrors)
          const firstApiError = Object.values(apiErrors)[0]?.[0]
          if (firstApiError) {
            toast.error(firstApiError)
          }
        } else {
          toast.error('Failed to update loyalty settings')
        }
      } else {
        toast.error('Failed to update loyalty settings')
      }
    } finally {
      setIsLoyaltySaving(false)
    }
  }, [loyaltyLocalErrors, loyaltySettings])

  const handleResetLoyaltySettings = useCallback(() => {
    setLoyaltySettings(initialLoyaltySettings)
    setLoyaltyFieldErrors({})
    toast.info('Loyalty settings reset')
  }, [initialLoyaltySettings])

  useEffect(() => {
    if (!manualUpdateCheckRequested) {
      return
    }

    if (updateStatus === 'update-not-available') {
      toast.success("You're up to date")
      setManualUpdateCheckRequested(false)
      return
    }

    if (
      updateStatus === 'update-available' ||
      updateStatus === 'update-downloaded' ||
      updateStatus === 'update-error'
    ) {
      setManualUpdateCheckRequested(false)
    }
  }, [manualUpdateCheckRequested, updateStatus])

  useEffect(() => {
    loadLoyaltySettings()
  }, [loadLoyaltySettings])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isLoyaltyDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isLoyaltyDirty])

  const handleTabChange = useCallback(
    (nextTab: string) => {
      if (activeTab === 'loyalty' && nextTab !== 'loyalty' && isLoyaltyDirty) {
        const confirmed = window.confirm(
          'You have unsaved loyalty settings changes. Leave this tab and discard changes?'
        )
        if (!confirmed) {
          return
        }
      }

      setActiveTab(nextTab)
    },
    [activeTab, isLoyaltyDirty]
  )

  const handleCheckForUpdates = () => {
    if (!supportsUpdater) {
      toast.info('Update checking is only available in the desktop app')
      return
    }
    setManualUpdateCheckRequested(true)
    checkForUpdates()
  }

  const getUpdateStatusText = () => {
    switch (updateStatus) {
      case 'idle':
        return 'Check for updates to see if a new version is available.'
      case 'checking-for-update':
        return 'Checking for updates…'
      case 'update-not-available':
        return "You're up to date."
      case 'update-available':
        return updateInfo?.version
          ? `Update available: v${updateInfo.version}`
          : 'Update available.'
      case 'download-progress':
        return downloadProgress
          ? `Downloading… ${Math.round(downloadProgress.percent)}%`
          : 'Downloading update…'
      case 'update-downloaded':
        return updateInfo?.version
          ? `Update downloaded: v${updateInfo.version} (restart to install)`
          : 'Update downloaded (restart to install).'
      case 'update-error':
        return updateError ? `Update error: ${updateError}` : 'Update error.'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="payment-types">
            <Tag className="mr-1 h-3 w-3" />
            Payment Types
          </TabsTrigger>
          <TabsTrigger value="cache">
            <Database className="mr-1 h-3 w-3" />
            Cache
          </TabsTrigger>
          {/* <TabsTrigger value="currency">
            <DollarSign className="mr-1 h-3 w-3" />
            Currency
          </TabsTrigger> */}
          <TabsTrigger value="about">
            <Info className="mr-1 h-3 w-3" />
            About
          </TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Select your preferred theme</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    System
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Play sounds for actions</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                POS Settings
              </CardTitle>
              <CardDescription>Configure point of sale behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-print Receipt</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically print receipt after sale
                  </p>
                </div>
                <Switch checked={autoPrintReceipt} onCheckedChange={setAutoPrintReceipt} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Smart Tender</Label>
                  <p className="text-sm text-muted-foreground">
                    Show Smart Tender before opening payment
                  </p>
                </div>
                <Switch checked={smartTenderEnabled} onCheckedChange={setSmartTenderEnabled} />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Label>Printer Routing</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose dedicated printers for receipts and shelf labels (desktop only)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPrinters}
                      disabled={!hasPrinterApi || isLoadingPrinters}
                    >
                      {isLoadingPrinters ? 'Loading...' : 'Refresh list'}
                    </Button>
                  </div>
                </div>

                {hasPrinterApi ? (
                  printers.length || isLoadingPrinters ? (
                    <div className="grid gap-4 pt-2 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Receipt printer</p>
                        <Select
                          value={receiptPrinterValue}
                          onValueChange={handleReceiptPrinterChange}
                          disabled={isLoadingPrinters || (!printers.length && !isLoadingPrinters)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select printer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={DEFAULT_PRINTER_VALUE}>
                              Use system default
                            </SelectItem>
                            {printers.map((printer) => (
                              <SelectItem key={printer.name} value={printer.name}>
                                {printer.displayName || printer.name}
                                {printer.isDefault ? ' (OS default)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Used for POS receipts and reprints.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Label printer</p>
                        <Select
                          value={labelPrinterValue}
                          onValueChange={handleLabelPrinterChange}
                          disabled={isLoadingPrinters || (!printers.length && !isLoadingPrinters)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select printer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={DEFAULT_PRINTER_VALUE}>
                              Use system default
                            </SelectItem>
                            {printers.map((printer) => (
                              <SelectItem key={`${printer.name}-label`} value={printer.name}>
                                {printer.displayName || printer.name}
                                {printer.isDefault ? ' (OS default)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Applied when printing barcode labels.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="pt-2 text-sm text-muted-foreground">
                      No printers were returned by Windows. Connect a printer and refresh the list.
                    </p>
                  )
                ) : (
                  <p className="pt-2 text-sm text-muted-foreground">
                    Printer routing is available in the desktop app.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <BusinessSettingsForm />
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Settings</CardTitle>
              <CardDescription>
                Configure loyalty earning and redemption rules for POS sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canEditLoyaltySettings && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                  You do not have permission to edit loyalty settings.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div className="text-sm">
                  {isLoyaltyDirty ? (
                    <span className="font-medium text-amber-600">You have unsaved changes.</span>
                  ) : (
                    <span className="text-muted-foreground">Settings are up to date.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadLoyaltySettings}
                    disabled={isLoyaltyLoading || isLoyaltySaving}
                  >
                    Reload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetLoyaltySettings}
                    disabled={!isLoyaltyDirty || isLoyaltyLoading || isLoyaltySaving}
                  >
                    Reset Changes
                  </Button>
                </div>
              </div>

              {isLoyaltyLoading ? (
                <div className="text-sm text-muted-foreground">Loading loyalty settings...</div>
              ) : (
                <>
                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">General</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Loyalty Enabled</Label>
                        <p className="text-sm text-muted-foreground">Enable loyalty features in POS</p>
                      </div>
                      <Switch
                        checked={loyaltySettings.enabled}
                        disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        onCheckedChange={(checked) =>
                          setLoyaltySettings((prev) => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">Earn Rules</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Earn Mode</Label>
                        <Select
                          value={loyaltySettings.earn_mode}
                          onValueChange={(value: 'amount_based' | 'percentage_based') =>
                            setLoyaltySettings((prev) => ({ ...prev, earn_mode: value }))
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount_based">Amount Based</SelectItem>
                            <SelectItem value="percentage_based">Percentage Based</SelectItem>
                          </SelectContent>
                        </Select>
                        {getLoyaltyFieldError('earn_mode') && (
                          <p className="text-xs text-destructive">{getLoyaltyFieldError('earn_mode')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Earn Value</Label>
                        <Input
                          type="number"
                          min={0}
                          value={loyaltySettings.earn_value}
                          onChange={(e) => handleLoyaltyNumberChange('earn_value', e.target.value)}
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        />
                        {getLoyaltyFieldError('earn_value') && (
                          <p className="text-xs text-destructive">{getLoyaltyFieldError('earn_value')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Sale Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          value={loyaltySettings.minimum_sale_amount}
                          onChange={(e) =>
                            handleLoyaltyNumberChange('minimum_sale_amount', e.target.value)
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        />
                        {getLoyaltyFieldError('minimum_sale_amount') && (
                          <p className="text-xs text-destructive">
                            {getLoyaltyFieldError('minimum_sale_amount')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <Label>Exclude Due Sales</Label>
                        <Switch
                          checked={loyaltySettings.exclude_due_sales}
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                          onCheckedChange={(checked) =>
                            setLoyaltySettings((prev) => ({ ...prev, exclude_due_sales: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-md border p-3">
                        <Label>Exclude Discounted Amount</Label>
                        <Switch
                          checked={loyaltySettings.exclude_discounted_amount}
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                          onCheckedChange={(checked) =>
                            setLoyaltySettings((prev) => ({ ...prev, exclude_discounted_amount: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">Redeem Rules</h4>

                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>Redeem Enabled</Label>
                      <Switch
                        checked={loyaltySettings.redeem_enabled}
                        disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        onCheckedChange={(checked) =>
                          setLoyaltySettings((prev) => ({ ...prev, redeem_enabled: checked }))
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Redeem Mode</Label>
                        <Select
                          value={loyaltySettings.redeem_mode}
                          onValueChange={(value: 'points_to_currency' | 'percentage_cap') =>
                            setLoyaltySettings((prev) => ({ ...prev, redeem_mode: value }))
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="points_to_currency">Points to Currency</SelectItem>
                            <SelectItem value="percentage_cap">Percentage Cap</SelectItem>
                          </SelectContent>
                        </Select>
                        {getLoyaltyFieldError('redeem_mode') && (
                          <p className="text-xs text-destructive">{getLoyaltyFieldError('redeem_mode')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Point Value</Label>
                        <Input
                          type="number"
                          min={0}
                          value={loyaltySettings.point_value}
                          onChange={(e) => handleLoyaltyNumberChange('point_value', e.target.value)}
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        />
                        {getLoyaltyFieldError('point_value') && (
                          <p className="text-xs text-destructive">{getLoyaltyFieldError('point_value')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Min Points to Redeem</Label>
                        <Input
                          type="number"
                          min={0}
                          value={loyaltySettings.min_points_to_redeem}
                          onChange={(e) =>
                            handleLoyaltyNumberChange('min_points_to_redeem', e.target.value)
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        />
                        {getLoyaltyFieldError('min_points_to_redeem') && (
                          <p className="text-xs text-destructive">
                            {getLoyaltyFieldError('min_points_to_redeem')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Max Redeem % of Bill</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={loyaltySettings.max_redeem_percent_of_bill}
                          onChange={(e) =>
                            handleLoyaltyNumberChange('max_redeem_percent_of_bill', e.target.value)
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        />
                        {getLoyaltyFieldError('max_redeem_percent_of_bill') && (
                          <p className="text-xs text-destructive">
                            {getLoyaltyFieldError('max_redeem_percent_of_bill')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <Label>Allow Partial Redeem</Label>
                        <Switch
                          checked={loyaltySettings.allow_partial_redeem}
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                          onCheckedChange={(checked) =>
                            setLoyaltySettings((prev) => ({ ...prev, allow_partial_redeem: checked }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Rounding Rule</Label>
                        <Select
                          value={loyaltySettings.rounding_rule}
                          onValueChange={(value: 'floor' | 'round' | 'ceil') =>
                            setLoyaltySettings((prev) => ({ ...prev, rounding_rule: value }))
                          }
                          disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="floor">Floor</SelectItem>
                            <SelectItem value="round">Round</SelectItem>
                            <SelectItem value="ceil">Ceil</SelectItem>
                          </SelectContent>
                        </Select>
                        {getLoyaltyFieldError('rounding_rule') && (
                          <p className="text-xs text-destructive">
                            {getLoyaltyFieldError('rounding_rule')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">Expiry</h4>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label>Expiry Enabled</Label>
                      <Switch
                        checked={loyaltySettings.expiry_enabled}
                        disabled={!canEditLoyaltySettings || isLoyaltySaving}
                        onCheckedChange={(checked) =>
                          setLoyaltySettings((prev) => ({
                            ...prev,
                            expiry_enabled: checked,
                            expiry_days: checked ? prev.expiry_days ?? 30 : null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Days</Label>
                      <Input
                        type="number"
                        min={1}
                        value={loyaltySettings.expiry_days ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setLoyaltySettings((prev) => ({
                            ...prev,
                            expiry_days: value === '' ? null : Math.max(1, Number(value) || 1),
                          }))
                          clearLoyaltyFieldError('expiry_days')
                        }}
                        disabled={!loyaltySettings.expiry_enabled || !canEditLoyaltySettings || isLoyaltySaving}
                      />
                      {getLoyaltyFieldError('expiry_days') && (
                        <p className="text-xs text-destructive">{getLoyaltyFieldError('expiry_days')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveLoyaltySettings}
                      disabled={
                        !canEditLoyaltySettings ||
                        isLoyaltySaving ||
                        isLoyaltyLoading ||
                        isLoyaltyFormInvalid ||
                        !isLoyaltyDirty
                      }
                    >
                      {isLoyaltySaving ? 'Saving...' : 'Save Loyalty Settings'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Types</CardTitle>
                  <CardDescription>Manage available payment methods</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingPaymentType(null)
                    setIsPaymentTypeOpen(true)
                  }}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Add Payment Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search payment types..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <PaymentTypesTable
                searchQuery={searchQuery}
                refreshTrigger={refreshTrigger}
                onEdit={(paymentType) => {
                  setEditingPaymentType(paymentType)
                  setIsPaymentTypeOpen(true)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Management
              </CardTitle>
              <CardDescription>
                Manage cached data and force fresh data synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cache Statistics */}
              {cacheStats && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="mb-3 font-semibold">Cache Statistics</h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products:</span>
                      <span className="font-medium">{cacheStats.products} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categories:</span>
                      <span className="font-medium">{cacheStats.categories} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offline Sales:</span>
                      <span className="font-medium">{cacheStats.offlineSales} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync Queue:</span>
                      <span className="font-medium">{cacheStats.syncQueue} pending</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Images:</span>
                      <span className="font-medium">{cacheStats.images} cached</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LocalStorage:</span>
                      <span className="font-medium">{cacheStats.localStorage} entries</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Clear Cache Section */}
              <div className="space-y-3">
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-destructive">Clear All Cache</h4>
                      <p className="text-sm text-muted-foreground">
                        This will remove all cached data including products, categories, images, and
                        offline sales. The application will reload and fetch fresh data from the
                        server.
                      </p>
                      {cacheStats && cacheStats.syncQueue > 0 && (
                        <p className="text-sm font-medium text-amber-600">
                          ⚠️ Warning: You have {cacheStats.syncQueue} pending sync operations that
                          will be lost!
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="mt-4 w-full"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                  >
                    {isClearingCache ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Clearing Cache...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Cache & Reload
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Section */}
                <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                    <Info className="h-4 w-4" />
                    When to clear cache?
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>• Data appears outdated or incorrect</li>
                    <li>• After major backend updates</li>
                    <li>• Product images not loading</li>
                    <li>• Sync errors persist</li>
                    <li>• Application behaving unexpectedly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <CurrencySettings />
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Application Information
              </CardTitle>
              <CardDescription>Version and build details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-base">Application Name</Label>
                  <span className="font-medium">{appInfo?.name || 'Horix POS Pro'}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-base">Current Version</Label>
                  <span className="font-mono">
                    {updateInfo?.version || appInfo?.version || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-base">Platform</Label>
                  <span className="font-medium capitalize">{appInfo?.platform || 'Unknown'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Updates
              </CardTitle>
              <CardDescription>Check for and install application updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <Label className="text-base">Update Status</Label>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {getUpdateStatusText()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCheckForUpdates}
                    disabled={!supportsUpdater || isChecking || isDownloading}
                    className="ml-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for updates
                  </Button>
                </div>

                {isUpdateAvailable && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          New version available: v{updateInfo?.version}
                        </p>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                          Download the update to begin installation.
                        </p>
                      </div>
                      <Button size="sm" onClick={downloadUpdate}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {isDownloading && downloadProgress && (
                  <div className="rounded-md border p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Downloading update...</span>
                        <span className="font-mono">{Math.round(downloadProgress.percent)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${downloadProgress.percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(downloadProgress.transferred / 1024 / 1024).toFixed(2)} MB of{' '}
                        {(downloadProgress.total / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                {isUpdateReady && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          Update ready to install
                        </p>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                          Restart the application to complete the installation.
                        </p>
                      </div>
                      <Button size="sm" onClick={quitAndInstall}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restart now
                      </Button>
                    </div>
                  </div>
                )}

                {hasError && updateError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">
                      <strong>Error:</strong> {updateError}
                    </p>
                  </div>
                )}

                {!supportsUpdater && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      Automatic updates are only available in the desktop application.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure invoice appearance and options</CardDescription>
            </CardHeader>
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              <p>Invoice settings will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              <p>Notification settings will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage security settings</CardDescription>
            </CardHeader>
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              <p>Security settings will be implemented here</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage staff accounts</CardDescription>
            </CardHeader>
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              <p>User management will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentTypeDialog
        open={isPaymentTypeOpen}
        onOpenChange={(open) => {
          setIsPaymentTypeOpen(open)
          if (!open) setEditingPaymentType(null)
        }}
        editData={editingPaymentType}
        onSuccess={refresh}
      />
    </div>
  )
}

export default SettingsPage
