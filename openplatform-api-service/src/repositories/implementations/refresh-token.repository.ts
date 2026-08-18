/**
 * Refresh Token Repository Implementation
 * Client obtained from db-client.getClient().
 */

import { Prisma, RefreshToken } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { RefreshTokenRepository } from '../repository.interfaces'

export class RefreshTokenRepositoryImpl extends BaseRepository<Prisma.RefreshTokenDelegate> implements RefreshTokenRepository {
  protected get modelName(): string {
    return 'refreshToken'
  }

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
    return this.model.create({ data: record })
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.model.findUnique({ where: { jti } })
  }

  async findByAppid(appid: string): Promise<RefreshToken[]> {
    return this.model.findMany({ where: { appid } })
  }

  async revoke(jti: string): Promise<boolean> {
    const record = await this.model.findUnique({ where: { jti } })
    if (!record) return false
    await this.model.update({
      where: { jti },
      data: { revoked: true },
    })
    return true
  }

  async markReplaced(jti: string, replacedByJti: string): Promise<boolean> {
    const record = await this.model.findUnique({ where: { jti } })
    if (!record) return false
    await this.model.update({
      where: { jti },
      data: { replaced_by_jti: replacedByJti },
    })
    return true
  }

  async deleteExpired(): Promise<number> {
    const now = BigInt(Date.now())
    const result = await this.model.deleteMany({
      where: {
        expires_at: { lt: now },
      },
    })
    return result.count
  }
}