/**
 * Developer 管理 API 类型定义
 *
 * 提供开发者/ISV 管理的接口类型
 *
 * @module types/api/developer
 * @author Admin Portal V2 Team
 */

declare namespace Api {
  namespace Developer {
    /** 开发者列表项 */
    interface DeveloperItem {
      id: string
      legalName: string
      registrationNumber: string
      jurisdiction: string
      contactEmail: string
      status: string
      kybStatus: string
      createdAt: string
    }

    /** 开发者详情 */
    interface DeveloperDetail extends DeveloperItem {
      email: string
      dateOfIncorporation: string
      registeredAddress: string
      website: string
      uboInfo: any
      kybReviewedAt: string
      kybReviewedBy: string
      updatedAt: string
    }

    /** 开发者列表响应 */
    interface ListResponse {
      list: DeveloperItem[]
      total: number
      page: number
      pageSize: number
    }

    /** 开发者统计响应 */
    interface StatsResponse {
      total: number
      active: number
      pending: number
      suspended: number
      banned: number
    }
  }
}

export {}