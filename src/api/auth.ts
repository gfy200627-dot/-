import type { LoginPayload, LoginResult, UserProfile } from '@/types'
import { get, post } from '@/utils/request'

/**
 * 认证相关接口
 * POST /api/auth/login
 * POST /api/auth/register
 * GET  /api/users/me
 */
export const authApi = {
  /** 登录（错误提示由页面自行处理，故 silent） */
  login(payload: LoginPayload): Promise<LoginResult> {
    return post<LoginResult>('/auth/login', payload, { silent: true })
  },
  register(payload: { username: string; password: string; nickname?: string; email?: string }): Promise<UserProfile> {
    return post<UserProfile>('/auth/register', payload, { silent: true })
  },
  me(): Promise<UserProfile> {
    return get<UserProfile>('/users/me', undefined, { silent: true })
  },
  logout(): Promise<null> {
    return post<null>('/auth/logout', undefined, { silent: true })
  }
}
