/**
 * Refresh Token Repository Implementation
 */

import { PrismaClient, RefreshToken } from '@prisma/client'
import { RefreshTokenRepository } from '../repository.interfaces'

export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: {
    jti: string
    appid: string
    user_id: string
    expires_at: bigint
    revoked: boolean
    replaced_by_jti: string | null
    created_at: bigint
    last_used_at: bigint | null
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: record })
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { jti } })
  }

  async findByAppid(appid: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({ where: { appid } })
  }

  async revoke(jti: string): Promise<boolean> {
    const record = await this.prisma.refreshToken.findUnique({ where: { jti } })
    if (!record) return false
    await this.prisma.refreshToken.update({
      where: { jti },
      data: { revoked: true },
    })
    return true
  }

  async markReplaced(jti: string, replacedByJti: string): Promise<boolean> {
    const record = await this.prisma.refreshToken.findUnique({ where: { jti } })
    if (!record) return false
    await this.prisma.refreshToken.update({
      where: { jti },
      data: { replaced_by_jti: replacedByJti },
    })
    return true
  }

  async deleteExpired(): Promise<number> {
    const now = BigInt(Date.now())
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: now },
      },
    })
    return result.count
  }
}