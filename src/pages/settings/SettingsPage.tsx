import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Store,
  Receipt,
  Bell,
  Palette,
  Lock,
  Users,
  Tag,
  RefreshCw,
  Download,
  DollarSign,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useUIStore, useBusinessStore } from '@/stores'
import { attributesService } from '@/api/services'
import { useAppUpdater } from '@/hooks/useAppUpdater'
import { AttributesSettings, CurrencySettings } from './components'
import type { Attribute } from '@/types/variant.types'

type AppInfo = {
  name: string
  version: string
  platform: string
}

export function SettingsPage() {
  const { theme, setTheme, soundEnabled, setSoundEnabled, autoPrintReceipt, setAutoPrintReceipt } =
    useUIStore()
  const business = useBusinessStore((state) => state.business)

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

  // Attributes state
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [attributesLoading, setAttributesLoading] = useState(false)

  // Fetch attributes
  const fetchAttributes = async () => {
    setAttributesLoading(true)
    try {
      const response = await attributesService.getAll()
      setAttributes(response.data || [])
    } catch (error) {
      console.error('Failed to fetch attributes:', error)
    } finally {
      setAttributesLoading(false)
    }
  }

  useEffect(() => {
    fetchAttributes()
  }, [])

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
        console.error('Failed to load app info', error)
      }
    }

    loadAppInfo()
  }, [])

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

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="attributes">
            <Tag className="mr-1 h-3 w-3" />
            Attributes
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input defaultValue={business?.companyName} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input defaultValue={business?.phoneNumber} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input defaultValue={business?.address} />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="space-y-4">
          <AttributesSettings
            attributes={attributes}
            isLoading={attributesLoading}
            onRefresh={fetchAttributes}
          />
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
    </div>
  )
}

export default SettingsPage
