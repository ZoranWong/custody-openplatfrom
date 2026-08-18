/**
 * ISV User Service
 * Business logic for ISV entities using Prisma types
 */

import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import {
  IsvDeveloper,
  IsvUser,
  Application,
} from '../repositories/repository.interfaces'
import { getIsvDeveloperRepository, getISVUserRepository, getApplicationRepository } from '../repositories/repository.factory'

// ============================================
// ISV Service
// ============================================

export const isvService = {
    async createISV(params: {
        email: string
        passwordHash: string
        legalName: string
        registrationNumber?: string
        jurisdiction?: string
        dateOfIncorporation?: string
        registeredAddress?: string
        website?: string
        uboInfo?: object[]
    }): Promise<IsvDeveloper> {
        const repo = getIsvDeveloperRepository()
        return repo.create({
            ...params,
            kybStatus: 'pending',
            status: 'active',
        })
    },

    async getISVById(id: string): Promise<IsvDeveloper | null> {
        const repo = getIsvDeveloperRepository()
        return repo.findById(id)
    },

    async updateISV(id: string, data: Partial<IsvDeveloper>): Promise<IsvDeveloper | null> {
        const repo = getIsvDeveloperRepository()
        return repo.update(id, data as Prisma.IsvDeveloperUpdateInput)
    }
}

// ============================================
// ISV User Service
// ============================================

export const isvUserService = {
    async registerOwner(params: {
        isvDeveloperId: string
        email: string
        password: string
        name: string
        phone?: string
    }): Promise<{ success: boolean; user?: Omit<IsvUser, 'passwordHash'>; error?: string }> {
        const repo = getISVUserRepository()

        const existing = await repo.findByIsvDeveloperAndEmail(params.isvDeveloperId, params.email)
        if (existing) {
            return { success: false, error: 'Email already registered in this ISV' }
        }

        const hashedPassword = bcrypt.hashSync(params.password, 10)
        const user = await repo.create({
            isvDeveloper: { connect: { id: params.isvDeveloperId } },
            email: params.email,
            passwordHash: hashedPassword,
            name: params.name,
            phone: params.phone,
            role: 'owner',
            status: 'active',
            allowedApplications: [],
        })

        const { passwordHash: _, ...result } = user
        return { success: true, user: result }
    },

    async addDeveloper(params: {
        isvDeveloperId: string
        email: string
        password: string
        name: string
        phone?: string
        allowedApplications?: string[]
    }): Promise<{ success: boolean; user?: Omit<IsvUser, 'passwordHash'>; error?: string }> {
        const repo = getISVUserRepository()

        const existing = await repo.findByIsvDeveloperAndEmail(params.isvDeveloperId, params.email)
        if (existing) {
            return { success: false, error: 'Email already registered in this ISV' }
        }

        const hashedPassword = bcrypt.hashSync(params.password, 10)
        const user = await repo.create({
            isvDeveloper: { connect: { id: params.isvDeveloperId } },
            email: params.email,
            passwordHash: hashedPassword,
            name: params.name,
            phone: params.phone,
            role: 'developer',
            status: 'active',
            allowedApplications: params.allowedApplications || [],
        })

        const { passwordHash: _, ...result } = user
        return { success: true, user: result }
    },

    async login(isvId: string, email: string, password: string): Promise<{
        success: boolean
        user?: Omit<IsvUser, 'passwordHash'>
        error?: string
    }> {
        const repo = getISVUserRepository()
        const user = await repo.findByIsvDeveloperAndEmail(isvId, email)

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        if (!user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
            return { success: false, error: 'Invalid password' }
        }

        if (user.status === 'suspended') {
            return { success: false, error: 'Account is suspended' }
        }

        const { passwordHash: _, ...result } = user
        return { success: true, user: result }
    },

    async getUserById(id: string): Promise<IsvUser | null> {
        const repo = getISVUserRepository()
        return repo.findById(id)
    },

    async getUserByEmail(email: string): Promise<IsvUser | null> {
        const repo = getISVUserRepository()
        return repo.findByEmail(email)
    },

    async getUsersByISV(isvId: string): Promise<Omit<IsvUser, 'passwordHash'>[]> {
        const repo = getISVUserRepository()
        const users = await repo.findByIsvDeveloper(isvId)
        return users.map(({ passwordHash: _, ...user }) => user)
    },

    async updateUser(id: string, data: Partial<IsvUser>): Promise<IsvUser | null> {
        const repo = getISVUserRepository()
        // Only allow updating certain fields
        const { id: __, passwordHash, role, isvDeveloperId, ...allowedUpdates } = data
        const updateData: { name?: string | null; phone?: string | null; status?: string; allowedApplications?: string[]; passwordHash?: string } = {
            ...(allowedUpdates.name !== undefined && { name: allowedUpdates.name }),
            ...(allowedUpdates.phone !== undefined && { phone: allowedUpdates.phone }),
            ...(allowedUpdates.status !== undefined && { status: allowedUpdates.status }),
            ...(allowedUpdates.allowedApplications !== undefined && { allowedApplications: allowedUpdates.allowedApplications as string[] }),
        }
        if (passwordHash) updateData.passwordHash = passwordHash
        return repo.update(id, updateData)
    }
}

// ============================================
// Application Service
// ============================================

export const isvApplicationService = {
    async createApplication(params: {
        isvDeveloperId: string
        appName: string
        appType: 'corporate' | 'payment' | 'custody'
        appDescription?: string
        appLogoUrl?: string
        callbackUrl?: string
    }): Promise<Application> {
        const repo = getApplicationRepository()
        return repo.create({
            isvDeveloper: { connect: { id: params.isvDeveloperId } },
            appName: params.appName,
            appDescription: params.appDescription,
            appType: params.appType,
            appLogoUrl: params.appLogoUrl,
            appSecret: `sk_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`,
            callbackUrl: params.callbackUrl,
            status: 'active',
        })
    },

    async getApplicationById(id: string): Promise<Application | null> {
        const repo = getApplicationRepository()
        return repo.findById(id)
    },

    async getApplicationByAppId(appId: string): Promise<Application | null> {
        const repo = getApplicationRepository()
        return repo.findByAppId(appId)
    },

    async getApplicationsByISV(isvId: string): Promise<Omit<Application, 'appSecret'>[]> {
        const repo = getApplicationRepository()
        const apps = await repo.findByIsvDeveloper(isvId)
        return apps.map(({ appSecret: _, ...app }) => app)
    },

    async updateApplication(id: string, data: Partial<Application>): Promise<Application | null> {
        const repo = getApplicationRepository()
        return repo.update(id, data)
    },

    async deleteApplication(id: string): Promise<Application> {
        const repo = getApplicationRepository()
        return repo.delete(id)
    }
}
