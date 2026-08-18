/**
 * Developer Application Service
 * Handles the business logic for developer application approval.
 *
 * Uses runTransaction() from repository.factory to coordinate writes
 * across multiple repositories atomically. Each repository only touches
 * its own table. The Service owns the business rules.
 */

import { runTransaction, getDeveloperApplicationRepository, getIsvDeveloperRepository, getDeveloperAuditRepository, getSubscriptionRepository, getPackageRepository } from '../repositories/repository.factory';

export interface ApprovalResult {
  applicationId: string;
  developerId: string;
}

/**
 * Approve a developer application.
 *
 * Business rules:
 * - Create the IsvDeveloper record from the application data
 * - Mark the application as approved
 * - Write an audit log entry
 * - Auto-create a trial subscription if a TRIAL package exists
 *
 * All writes run in a single database transaction via runTransaction().
 */
export async function approveApplication(params: {
  applicationId: string;
  adminId: string;
  adminEmail: string;
}): Promise<ApprovalResult> {
  const { applicationId, adminId, adminEmail } = params;

  const developer = await runTransaction(async () => {
    // 1. Read application
    const appRepo = getDeveloperApplicationRepository();
    const app = await appRepo.findById(applicationId);
    if (!app) throw new Error('Application not found');

    // 2. Create developer
    const dev = await getIsvDeveloperRepository().create({
      email: app.email,
      passwordHash: app.passwordHash,
      legalName: app.legalName,
      registrationNumber: app.registrationNumber,
      jurisdiction: app.jurisdiction,
      dateOfIncorporation: app.dateOfIncorporation,
      registeredAddress: app.registeredAddress,
      website: app.website,
      uboInfo: app.uboInfo ?? undefined,
      kybStatus: 'approved',
      kybReviewedAt: new Date(),
      kybReviewedBy: adminEmail,
      status: 'active',
    });

    // 3. Update application status
    await appRepo.update(app.id, {
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      developerId: dev.id,
    });

    // 4. Write audit log
    await getDeveloperAuditRepository().create({
      developerId: dev.id,
      action: 'approve',
      adminId,
      adminEmail,
      previousStatus: 'pending',
      newStatus: 'approved',
    });

    // 5. Auto-create trial subscription (business rule)
    const trialPackage = await getPackageRepository().findByCodeAndStatus('TRIAL', 'active');
    if (trialPackage) {
      const now = new Date();
      await getSubscriptionRepository().create({
        developer: { connect: { id: dev.id } },
        package: { connect: { id: trialPackage.id } },
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        billingCycle: 'trial',
      });
    }

    return dev;
  });

  return { applicationId, developerId: developer.id };
}