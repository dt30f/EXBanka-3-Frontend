import api from './client'

export interface ActuaryManagementItem {
  employeeId: string
  ime: string
  prezime: string
  email: string
  username: string
  pozicija: string
  departman: string
  aktivan: boolean
  permissionNames: string[]
  isActuary: boolean
  isSupervisor: boolean
  limit?: number
  usedLimit: number
  needApproval: boolean
}

export const actuaryApi = {
  list: () => api.get<{ actuaries: ActuaryManagementItem[]; count: number }>('/actuaries'),
}
