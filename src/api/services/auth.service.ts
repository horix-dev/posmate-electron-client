import api, { ApiResponse, setAuthToken, clearAuthToken } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
  OtpRequest,
  User,
  Business,
} from '@/types/api.types'

export const authService = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API_ENDPOINTS.AUTH.LOGIN, credentials)
    if (data.data.token) {
      setAuthToken(data.data.token)
    }
    return data
  },

  /**
   * Sign up new user
   */
  signUp: async (userData: SignUpRequest): Promise<ApiResponse<SignUpResponse>> => {
    const { data } = await api.post<ApiResponse<SignUpResponse>>(API_ENDPOINTS.AUTH.SIGN_UP, userData)
    if (data.data && 'token' in data && data.data) {
      const token = (data as unknown as { token: string }).token
      if (token) {
        setAuthToken(token)
      }
    }
    return data
  },

  /**
   * Submit OTP for verification
   */
  submitOtp: async (
    otpData: OtpRequest
  ): Promise<{ message: string; is_setup: boolean; token: string }> => {
    const { data } = await api.post<{ message: string; is_setup: boolean; token: string }>(
      API_ENDPOINTS.AUTH.SUBMIT_OTP,
      otpData
    )
    if (data.token) {
      setAuthToken(data.token)
    }
    return data
  },

  /**
   * Resend OTP
   */
  resendOtp: async (email: string): Promise<ApiResponse<unknown>> => {
    const { data } = await api.post<ApiResponse<unknown>>(API_ENDPOINTS.AUTH.RESEND_OTP, { email })
    return data
  },

  /**
   * Sign out and invalidate token
   */
  signOut: async (): Promise<void> => {
    try {
      await api.post(API_ENDPOINTS.AUTH.SIGN_OUT)
    } finally {
      clearAuthToken()
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      const { data } = await api.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH_TOKEN)
      if (data.token) {
        setAuthToken(data.token)
        return data.token
      }
      return null
    } catch {
      clearAuthToken()
      return null
    }
  },

  /**
   * Check if a module is enabled
   */
  checkModule: async (moduleName: string): Promise<boolean> => {
    const { data } = await api.post<{ status: boolean }>(
      `${API_ENDPOINTS.AUTH.MODULE_CHECK}?module_name=${moduleName}`
    )
    return data.status
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<User & { business: Business }>> => {
    const { data } = await api.get<ApiResponse<User & { business: Business }>>(
      API_ENDPOINTS.PROFILE.GET
    )
    return data
  },

  /**
   * Update user profile
   */
  updateProfile: async (
    profileData: FormData
  ): Promise<ApiResponse<User>> => {
    const { data } = await api.post<ApiResponse<User>>(API_ENDPOINTS.PROFILE.UPDATE, profileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Change password
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<unknown>> => {
    const { data } = await api.post<ApiResponse<unknown>>(API_ENDPOINTS.PROFILE.CHANGE_PASSWORD, {
      current_password: currentPassword,
      password: newPassword,
    })
    return data
  },
}

export default authService
