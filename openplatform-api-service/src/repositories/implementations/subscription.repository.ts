import { Prisma, Subscription } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { SubscriptionRepository, QuotaResult } from '../repository.interfaces'

export class SubscriptionRepositoryImpl extends BaseRepository<Prisma.SubscriptionDelegate> implements SubscriptionRepository {
  protected get modelName(): string {
    return 'subscription'
  }

  async findByFilters(where: Prisma.SubscriptionWhereInput, page: number, pageSize: number) {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        developer: {
          select: { id: true, legalName: true, email: true },
        },
        package: {
          select: { id: true, name: true, packageCode: true },
        },
      },
    })
  }

  async findByDeveloperId(developerId: string) {
    return this.model.findFirst({
      where: { developerId, status: 'active' },
      include: {
        package: {
          select: { id: true, name: true, packageCode: true, monthlyPrice: true, yearlyPrice: true },
        },
      },
      orderBy: { startDate: 'asc' },
    })
  }

  async findActiveWithPackage(developerId: string) {
    return this.model.findFirst({
      where: { developerId, status: 'active' },
      include: {
        package: { select: { dailyApiLimit: true } },
      },
      orderBy: { startDate: 'asc' },
    }) as Promise<(Subscription & { package: { dailyApiLimit: number } }) | null>
  }

  /**
   * Atomically increment daily API usage.
   * Uses database-level atomicity: updateMany only succeeds when
   * dailyApiUsage < dailyLimit, preventing the read-then-write race condition.
   */
  async atomicIncrementDailyUsage(developerId: string): Promise<QuotaResult> {
    const sub = await this.findActiveWithPackage(developerId)
    if (!sub) {
      return { allowed: true, currentUsage: 0, dailyLimit: 0 }
    }

    const dailyLimit = sub.package?.dailyApiLimit ?? 1000

    // Atomic: only increment if current usage is below the limit
    const result = await this.model.updateMany({
      where: { id: sub.id, dailyApiUsage: { lt: dailyLimit } },
      data: { dailyApiUsage: { increment: 1 } },
    })

    if (result.count === 0) {
      // Quota exceeded — read the current value for the response
      const current = await this.model.findUnique({
        where: { id: sub.id },
        select: { dailyApiUsage: true },
      })
      return {
        allowed: false,
        currentUsage: current?.dailyApiUsage ?? dailyLimit,
        dailyLimit,
        subscriptionId: sub.id,
      }
    }

    return {
      allowed: true,
      currentUsage: sub.dailyApiUsage + 1,
      dailyLimit,
      subscriptionId: sub.id,
    }
  }

  async resetAllDailyUsage(): Promise<number> {
    const result = await this.model.updateMany({
      where: { dailyApiUsage: { gt: 0 } },
      data: { dailyApiUsage: 0 },
    })
    return result.count
  }
}