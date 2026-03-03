/**
 * ISV User Service
 * Business logic for ISV entities
 */

import bcrypt from 'bcrypt'
import { ISVUser, ISVUserRole, ISVUserStatus, ISV, Application, UBO } from '../types/isv.types'
import { getISVRepository, getISVUserRepository, getApplicationRepository } from '../repositories/repository.factory'

// ============================================
// ISV Service
// ============================================

export const isvService = {
    async createISV(params: {
        legalName: string
        registrationNumber: string
        jurisdiction: string
        dateOfIncorporation: string
        registeredAddress: string
        website?: string
        uboInfo: UBO[]
    }): Promise<ISV> {
        const repo = getISVRepository()
        return repo.create({
            ...params,
            kybStatus: 'pending',
            status: 'active'
        })
    },

    async getISVById(id: string): Promise<ISV | null> {
        const repo = getISVRepository()
        return repo.findById(id)
    },

    async getAllISVs(): Promise<ISV[]> {
        const repo = getISVRepository()
        return repo.findMany()
    },

    async updateISV(id: string, data: Partial<ISV>): Promise<ISV | null> {
        const repo = getISVRepository()
        return repo.update(id, data)
    }
}

// ============================================
// ISV User Service
// ============================================

export const isvUserService = {
    async registerOwner(params: {
        isvId: string
        email: string
        password: string
        name: string
        phone?: string
    }): Promise<{ success: boolean; user?: Omit<ISVUser, 'password'>; error?: string }> {
        const repo = getISVUserRepository()

        const existing = await repo.findByISVAndEmail(params.isvId, params.email)
        if (existing) {
            return { success: false, error: 'Email already registered in this ISV' }
        }

        const hashedPassword = bcrypt.hashSync(params.password, 10)
        const user = await repo.create({
            ...params,
            password: hashedPassword,
            role: ISVUserRole.OWNER,
            status: ISVUserStatus.ACTIVE,
            allowedApplications: []
        })

        const { password: _, ...result } = user
        return { success: true, user: result }
    },

    async addDeveloper(params: {
        isvId: string
        email: string
        password: string
        name: string
        phone?: string
        allowedApplications?: string[]
    }): Promise<{ success: boolean; user?: Omit<ISVUser, 'password'>; error?: string }> {
        const repo = getISVUserRepository()

        const existing = await repo.findByISVAndEmail(params.isvId, params.email)
        if (existing) {
            return { success: false, error: 'Email already registered in this ISV' }
        }

        const hashedPassword = bcrypt.hashSync(params.password, 10)
        const user = await repo.create({
            ...params,
            password: hashedPassword,
            role: ISVUserRole.DEVELOPER,
            status: ISVUserStatus.ACTIVE,
            allowedApplications: params.allowedApplications || []
        })

        const { password: _, ...result } = user
        return { success: true, user: result }
    },

    async login(isvId: string, email: string, password: string): Promise<{
        success: boolean
        user?: Omit<ISVUser, 'password'>
        error?: string
    }> {
        const repo = getISVUserRepository()
        const user = await repo.findByISVAndEmail(isvId, email)

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        if (!user.password || !bcrypt.compareSync(password, user.password)) {
            return { success: false, error: 'Invalid password' }
        }

        if (user.status === ISVUserStatus.SUSPENDED) {
            return { success: false, error: 'Account is suspended' }
        }

        const { password: _, ...result } = user
        return { success: true, user: result }
    },

    async getUserById(id: string): Promise<ISVUser | null> {
        const repo = getISVUserRepository()
        return repo.findById(id)
    },

    async getUserByEmail(email: string): Promise<ISVUser | null> {
        const repo = getISVUserRepository()
        return repo.findByEmail(email)
    },

    async getUsersByISV(isvId: string): Promise<Omit<ISVUser, 'password'>[]> {
        const repo = getISVUserRepository()
        const users = await repo.findByISV(isvId)
        return users.map(({ password: _, ...user }) => user)
    },

    async updateUser(id: string, data: Partial<ISVUser>): Promise<ISVUser | null> {
        const repo = getISVUserRepository()
        const { id: _, password: __, role: ___, isvId: ____, ...allowedUpdates } = data as any
        return repo.update(id, allowedUpdates)
    }
}

// ============================================
// Application Service
// ============================================

export const isvApplicationService = {
    async createApplication(params: {
        isvId: string
        name: string
        description?: string
        callbackUrl?: string
        type: 'corporate' | 'payment' | 'custody'
    }): Promise<Application> {
        const repo = getApplicationRepository()
        // Repository's create method will generate id and appId
        return repo.create({
            isvId: params.isvId,
            name: params.name,
            description: params.description,
            callbackUrl: params.callbackUrl,
            type: params.type,
            status: 'active', // Apps are active immediately after creation
            permittedUsers: [],
            // appSecret will be generated by the repository's create method
            appSecret: undefined
        })
    },

    async getApplicationById(id: string): Promise<Application | null> {
        const repo = getApplicationRepository()
        return repo.findById(id)
    },

    async getApplicationsByISV(isvId: string): Promise<Omit<Application, 'appSecret'>[]> {
        const repo = getApplicationRepository()
        const apps = await repo.findByISV(isvId)
        return apps.map(({ appSecret: _, ...app }) => app)
    },

    async getUserAccessibleApplications(userId: string): Promise<Omit<Application, 'appSecret'>[]> {
        const userRepo = getISVUserRepository()
        const appRepo = getApplicationRepository()

        const user = await userRepo.findById(userId)
        if (!user) return []

        if (user.role === ISVUserRole.OWNER) {
            return this.getApplicationsByISV(user.isvId)
        }

        const apps = await appRepo.findByISV(user.isvId)
        return apps
            .filter(a => a.permittedUsers.length === 0 || a.permittedUsers.includes(userId))
            .map(({ appSecret: _, ...app }) => app)
    },

    async updateApplication(id: string, data: Partial<Application>): Promise<Application | null> {
        const repo = getApplicationRepository()
        return repo.update(id, data)
    },

    async updateApplicationPermissions(appId: string, userIds: string[]): Promise<Application | null> {
        const repo = getApplicationRepository()
        const app = await repo.findById(appId)
        if (!app) return null

        return repo.update(appId, { permittedUsers: userIds })
    },

    async deleteApplication(id: string): Promise<boolean> {
        const repo = getApplicationRepository()
        return repo.delete(id)
    }
}
