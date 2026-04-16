/**
 * Transfer Task Detail Dialog
 * A popup dialog component for displaying transfer task details
 */

import {
    TransferTaskDetailDialogOptions,
    TransferTaskDetailData,
    TransferParty,
    ApprovalStep,
    getStatusDisplay,
    TravelRuleItem,
} from './types';
import { injectDialogStyles } from './styles';
import { signBySealx, closeSealx } from 'sealx-sdk';

/**
 * Generate SVG icon elements
 */
const icons = {
    arrowLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>`,
    check: `<svg class="transfer-task-dialog-approval-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    location: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    copy: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>`,
    folder: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path></svg>`,
    externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
};

/**
 * Helper functions
 */

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get avatar letter from name
 */
function getAvatarLetter(name: string): string {
    return name.charAt(0).toUpperCase();
}

/**
 * Create party avatar HTML
 */
function createPartyAvatar(party: TransferParty, isSender: boolean): string {
    const letter = party.avatarLetter || getAvatarLetter(party.name);
    const avatarClass = isSender
        ? 'transfer-task-dialog-party-avatar-gradient'
        : 'transfer-task-dialog-party-avatar-default';

    return `
        <div class="transfer-task-dialog-party-avatar ${avatarClass}">
            ${letter}
        </div>
    `;
}

/**
 * Create party card HTML
 */
function createPartyCard(party: TransferParty, label: string, isSender: boolean): string {
    const travelRuleLabel = isSender ? 'Originator' : 'Beneficiary';
    return `
        <div class="transfer-task-dialog-party-card">
            <div class="transfer-task-dialog-party-label">${label}</div>
            <div class="transfer-task-dialog-party-header">
                ${createPartyAvatar(party, isSender)}
                <div>
                    <div class="transfer-task-dialog-party-name">${party.name}</div>
                    ${party.id ? `<div class="transfer-task-dialog-party-id">ID: ${party.id}</div>` : ''}
                    ${party.alias ? `<div class="transfer-task-dialog-party-id">${party.alias}</div>` : ''}
                </div>
            </div>
            <div class="transfer-task-dialog-party-address-label">Address</div>
            <div class="transfer-task-dialog-party-address" data-address="${party.address}" title="Copy Address">
                <span>${truncateAddress(party.address)}</span>
                ${icons.copy}
            </div>
            ${party.type ? `<div class="transfer-task-dialog-party-type" style="font-size: 10px; color: #9ca3af; margin-top: 4px;">${party.type === 'account' ? 'Account' : 'External'}</div>` : ''}
            ${party.travelRule ? `
                <div class="transfer-task-dialog-travel-rule-section">
                    ${travelRuleRenderer(party.travelRule, travelRuleLabel)}
                </div>
            ` : ''}
        </div>
    `;
}

function travelRuleRenderer(travelRule: TravelRuleItem, label: string): string {
    if (!travelRule) return '';
    const { name, country, verified, vasp } = travelRule;
    return `
            <div class="transfer-task-dialog-travel-rule">
                <div class="transfer-task-dialog-travel-rule-header">
                    <div class="transfer-task-dialog-travel-rule-dot"></div>
                    <span class="transfer-task-dialog-travel-rule-label">${label} (Travel Rule)</span>
                </div>
                <div class="transfer-task-dialog-travel-rule-name">${name}</div>
                <div class="transfer-task-dialog-travel-rule-country">
                    ${icons.location}
                    <span>${country}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                    ${verified ? `
                        <span class="transfer-task-dialog-travel-rule-verified">
                            ${icons.check}
                            <span>Verified</span>
                        </span>
                    ` : ''}
                    ${vasp ? `<span class="transfer-task-dialog-travel-rule-vasp">VASP: ${vasp}</span>` : ''}
                </div>
            </div>
        `;
}

/**
 * Create approval flow step HTML
 */
function createApprovalStepHTML(step: ApprovalStep, _index: number): string {
    const statusClass = step.status === 'completed'
        ? 'completed'
        : step.status === 'current'
            ? 'current'
            : 'pending';

    let statusContent = '';

    if (step.status === 'completed') {
        statusContent = `
            ${step.actor ? `
                <div class="transfer-task-dialog-approval-actor">
                    ${step.actorAvatar ? `<div class="transfer-task-dialog-approval-avatar">${step.actorAvatar}</div>` : ''}
                    <span class="transfer-task-dialog-approval-actor-name">${step.actor}</span>
                </div>
            ` : ''}
            ${step.timestamp ? `<div class="transfer-task-dialog-approval-timestamp">${step.timestamp}</div>` : ''}
        `;
    } else if (step.status === 'current') {
        const actorAvatarLetter = step.actorAvatar || (step.actor ? step.actor.charAt(0).toUpperCase() : 'Y');
        statusContent = `
            ${step.actor || step.actorAvatar ? `
                <div class="transfer-task-dialog-approval-actor">
                    <div class="transfer-task-dialog-approval-avatar" style="background: #F59E0B; color: #fff; border-radius: 50%;">${actorAvatarLetter}</div>
                    <span class="transfer-task-dialog-approval-actor-name">${step.actor || 'You'}</span>
                </div>
            ` : ''}
            ${step.note ? `<div class="transfer-task-dialog-approval-note">${step.note}</div>` : ''}
            ${step.timestamp ? `<div class="transfer-task-dialog-approval-timestamp">${step.timestamp}</div>` : ''}
        `;
    } else {
        statusContent = `<div class="transfer-task-dialog-approval-pending-text">Pending approval</div>`;
    }

    return `
        <div class="transfer-task-dialog-approval-step ${statusClass}">
            <div class="transfer-task-dialog-approval-dot ${statusClass}">
                ${step.status === 'completed' ? icons.check : ''}
            </div>
            <div class="transfer-task-dialog-approval-name">${step.name}</div>
            ${statusContent}
        </div>
    `;
}

/**
 * Create single mode From/To HTML
 */
function createSingleModeHTML(data: TransferTaskDetailData): string {
    const to = Array.isArray(data.to) ? data.to[0] : data.to;

    return `
        <div class="transfer-task-dialog-from-to">
            ${createPartyCard(data.from, 'From', true)}
            <div class="transfer-task-dialog-connector">
                <div class="transfer-task-dialog-connector-inner">
                    ${icons.arrowRight}
                </div>
            </div>
            ${createPartyCard(to, 'To', false)}
        </div>
    `;
}

/**
 * Create multiple mode From/To HTML
 */
function createMultipleModeHTML(data: TransferTaskDetailData): string {
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    const recipientsList = recipients.map((recipient, _index) => {
        const extraData = recipient as TransferParty & { txid?: string; country?: string; amount?: string };
        const txid = extraData.txid || 'pending';
        const country = extraData.country || '';
        const amount = extraData.amount || data.amount;

        return `
            <div class="transfer-task-dialog-recipient-item" data-recipient>
                <div class="transfer-task-dialog-recipient-header">
                    <div class="transfer-task-dialog-recipient-info">
                        <div class="transfer-task-dialog-recipient-avatar">${getAvatarLetter(recipient.name)}</div>
                        <div>
                            <div class="transfer-task-dialog-recipient-name">${recipient.name}</div>
                            ${recipient.alias ? `<div class="transfer-task-dialog-recipient-alias">${recipient.alias}</div>` : ''}
                        </div>
                    </div>
                    <span class="transfer-task-dialog-recipient-amount">${amount} ${data.coin}</span>
                </div>
                <div class="transfer-task-dialog-recipient-details">
                    ${country ? `<span>${country}</span>` : ''}
                    <span class="transfer-task-dialog-recipient-address" data-address="${recipient.address}">${truncateAddress(recipient.address)}</span>
                </div>
                <div class="transfer-task-dialog-recipient-txid">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #9ca3af; font-size: 10px;">TXID:</span>
                        <span class="transfer-task-dialog-recipient-txid-text">${truncateAddress(txid)}</span>
                        <button class="btn-copy-txid" style="border: none; background: transparent; cursor: pointer; color: #9ca3af; padding: 0;">
                            ${icons.copy}
                        </button>
                    </div>
                    <button class="transfer-task-dialog-explorer-link">
                        ${icons.externalLink}
                        <span>Explorer</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Generate FROM section with Travel Rule
    const fromSection = `
        <div class="transfer-task-dialog-from-card">
            <div class="transfer-task-dialog-from-label">From</div>
            <div class="transfer-task-dialog-from-content">
                <div class="transfer-task-dialog-from-main">
                    <div class="transfer-task-dialog-party-header">
                        ${createPartyAvatar(data.from, true)}
                        <div>
                            <div class="transfer-task-dialog-party-name">${data.from.name}</div>
                            ${data.from.id ? `<div class="transfer-task-dialog-party-id">ID: ${data.from.id}</div>` : ''}
                        </div>
                    </div>
                    <div class="transfer-task-dialog-party-address-label">Address</div>
                    <div class="transfer-task-dialog-party-address" data-address="${data.from.address}" title="Copy Address">
                        <span>${truncateAddress(data.from.address)}</span>
                        ${icons.copy}
                    </div>
                </div>
                <div class="transfer-task-dialog-from-travel-rule">
                    ${data.from.travelRule && travelRuleRenderer(data.from.travelRule, 'Originator')}
                </div>
            </div>
        </div>
    `;

    return `
        ${fromSection}
        <div class="transfer-task-dialog-recipients-card">
            <div class="transfer-task-dialog-recipients-header">
                <span class="transfer-task-dialog-recipients-label">To <span style="color: #374151;">(Multiple Recipients)</span></span>
                <div class="transfer-task-dialog-recipients-summary">
                    <span style="color: #6b7280;">Total:</span>
                    <span class="transfer-task-dialog-recipients-total">${data.amount} ${data.coin}-${data.network}</span>
                    <span style="color: #9ca3af;">/</span>
                    <span class="transfer-task-dialog-recipients-count">${recipients.length} recipients</span>
                </div>
            </div>
            <div class="transfer-task-dialog-recipients-search">
                ${icons.search}
                <input type="text" id="recipients-search" placeholder="Search recipients..." />
            </div>
            <div class="transfer-task-dialog-recipients-list" id="recipients-list">
                ${recipientsList}
            </div>
        </div>
    `;
}

/**
 * Transfer Task Detail Dialog Class
 */
export class TransferTaskDetailDialog {
    private overlay: HTMLElement | null = null;
    private options: TransferTaskDetailDialogOptions;
    private data: TransferTaskDetailData | null = null;
    private isMultipleMode = false;
    private isDestroyed = false;
    private isSigning = false;

    /**
     * Create a new TransferTaskDetailDialog
     * @param options Dialog options
     */
    constructor(options: TransferTaskDetailDialogOptions = {}) {
        this.options = {
            title: 'Review Task',
            ...options,
        };
        injectDialogStyles();
    }

    /**
     * Open the dialog with task data
     * @param data Transfer task detail data
     */
    public open(data: TransferTaskDetailData): void {
        if (this.isDestroyed) {
            throw new Error('Dialog has been destroyed');
        }

        this.data = data;
        this.isMultipleMode = Array.isArray(data.to) && data.to.length > 1;

        this.render();
        this.attachEventListeners();
    }

    /**
     * Close the dialog
     */
    public close(): void {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.options.onClose?.();
    }

    /**
     * Destroy the dialog instance
     */
    public destroy(): void {
        this.close();
        this.isDestroyed = true;
    }

    /**
     * Render the dialog
     */
    private render(): void {
        if (!this.data) return;

        const data = this.data;
        const statusConfig = getStatusDisplay(data.status);

        const html = `
            <div class="transfer-task-dialog-overlay" id="transfer-task-dialog-overlay">
                <div class="transfer-task-dialog-container ${this.options.className || ''}">
                    <!-- Header -->
                    <div class="transfer-task-dialog-header">
                        <div class="transfer-task-dialog-header-left">
                            <button class="transfer-task-dialog-back-btn" id="dialog-close-btn">
                                ${icons.close}
                            </button>
                            <h1 class="transfer-task-dialog-title">${this.options.title || 'Review Task'} #${data.taskId.replace('#', '')}</h1>
                            <span class="transfer-task-dialog-status-badge ${statusConfig.className}">
                                <span class="transfer-task-dialog-status-dot ${statusConfig.dotClass.includes('animate-pulse') ? 'animate-pulse' : ''}" style="background: ${statusConfig.dotClass.replace('animate-pulse', '')}"></span>
                                ${statusConfig.label}
                            </span>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="transfer-task-dialog-content">
                        <div class="transfer-task-dialog-grid">
                            <!-- Left Column: Transaction Details -->
                            <div class="transfer-task-dialog-left-column">
                                <!-- Transaction Details Card -->
                                <div class="transfer-task-dialog-card">
                                    <div class="transfer-task-dialog-card-header">
                                        <h2 class="transfer-task-dialog-card-title">Transaction Details</h2>
                                        <span class="transfer-task-dialog-status-badge" style="background: #eff6ff; color: #2563eb; border-color: #bfdbfe;">
                                            Transfer
                                        </span>
                                    </div>
                                    <div class="transfer-task-dialog-card-content">
                                        <!-- Amount Display -->
                                        <div class="transfer-task-dialog-amount-box">
                                            <span class="transfer-task-dialog-amount-label">Transfer Amount</span>
                                            <div class="transfer-task-dialog-amount-value">
                                                ${data.amount} ${data.coin}
                                            </div>
                                            <div class="transfer-task-dialog-amount-meta">
                                                <div class="transfer-task-dialog-network-tag">
                                                    <div style="width: 16px; height: 16px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 10px; font-weight: bold;">T</div>
                                                    <span>${data.network}</span>
                                                </div>
                                                ${data.contractAddress ? `
                                                    <div class="transfer-task-dialog-contract" title="Copy Contract Address">
                                                        <span>Contract:</span>
                                                        <span style="font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 2px;">${truncateAddress(data.contractAddress)}</span>
                                                        ${icons.copy}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>

                                    <!-- From/To Section -->
                                        <div id="from-to-container">
                                            ${this.isMultipleMode ? createMultipleModeHTML(data) : createSingleModeHTML(data)}
                                        </div>

                                        <!-- Proposal -->
                                        ${data.proposal ? `
                                            <div style="margin-bottom: 24px;">
                                                <label class="transfer-task-dialog-proposal-label">Proposal</label>
                                                <div class="transfer-task-dialog-proposal-content">
                                                    ${data.proposal}
                                                </div>
                                            </div>
                                        ` : ''}

                                        <!-- Meta Info -->
                                        <div class="transfer-task-dialog-meta-grid">
                                            <div class="transfer-task-dialog-meta-item">
                                                <div class="transfer-task-dialog-meta-label">Unit</div>
                                                <div class="transfer-task-dialog-meta-unit">
                                                    <div class="transfer-task-dialog-meta-unit-icon">
                                                        ${icons.folder}
                                                    </div>
                                                    <span class="transfer-task-dialog-meta-unit-name">${data.meta.unit}</span>
                                                </div>
                                            </div>
                                            <div class="transfer-task-dialog-meta-item">
                                                <div class="transfer-task-dialog-meta-label">Created At</div>
                                                <div class="transfer-task-dialog-meta-value">${data.meta.createdAt}</div>
                                            </div>
                                            <div class="transfer-task-dialog-meta-item">
                                                <div class="transfer-task-dialog-meta-label">Expires In</div>
                                                <div class="transfer-task-dialog-meta-value transfer-task-dialog-meta-value-warning">${data.meta.expiresIn}</div>
                                            </div>
                                            <div class="transfer-task-dialog-meta-item">
                                                <div class="transfer-task-dialog-meta-label">Task ID</div>
                                                <div class="transfer-task-dialog-meta-value">#${data.taskId.replace('#', '')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: Approval Flow -->
                            <div class="transfer-task-dialog-right-column">
                                <div class="transfer-task-dialog-card">
                                    <div class="transfer-task-dialog-card-header">
                                        <h2 class="transfer-task-dialog-card-title">Approval Flow</h2>
                                    </div>
                                    <div class="transfer-task-dialog-approval-flow">
                                        <div class="transfer-task-dialog-approval-timeline">
                                            ${data.approvalFlow.map((step, index) => createApprovalStepHTML(step, index)).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${this.shouldShowActionBar(data) ? `
                    <!-- Action Bar -->
                    <div class="transfer-task-dialog-action-bar">
                        <div class="transfer-task-dialog-action-bar-content">
                            <div class="transfer-task-dialog-action-info">
                                Reviewing task <span class="transfer-task-dialog-action-task-id">#${data.taskId.replace('#', '')}</span>
                            </div>
                            <div class="transfer-task-dialog-action-buttons">
                                <button class="transfer-task-dialog-btn-reject" id="dialog-reject-btn">Reject</button>
                                <button class="transfer-task-dialog-btn-sign" id="dialog-sign-btn">Sign</button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.innerHTML = html;
        document.body.appendChild(this.overlay);
    }

    /**
     * Attach event listeners
     */
    private attachEventListeners(): void {
        if (!this.overlay) return;

        // Close button
        const closeBtn = this.overlay.querySelector('#dialog-close-btn');
        closeBtn?.addEventListener('click', () => this.close());

        // Search recipients
        const searchInput = this.overlay.querySelector('#recipients-search') as HTMLInputElement;
        const recipientsList = this.overlay.querySelector('#recipients-list');
        if (searchInput && recipientsList) {
            searchInput.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value.toLowerCase();
                const recipientItems = recipientsList.querySelectorAll('[data-recipient]');

                recipientItems.forEach((item) => {
                    const nameEl = item.querySelector('.transfer-task-dialog-recipient-name');
                    const addressEl = item.querySelector('.transfer-task-dialog-recipient-address');
                    const txidEl = item.querySelector('.transfer-task-dialog-recipient-txid-text');

                    const name = nameEl?.textContent?.toLowerCase() || '';
                    const address = addressEl?.textContent?.toLowerCase() || '';
                    const txid = txidEl?.textContent?.toLowerCase() || '';

                    if (name.includes(query) || address.includes(query) || txid.includes(query)) {
                        (item as HTMLElement).style.display = '';
                    } else {
                        (item as HTMLElement).style.display = 'none';
                    }
                });
            });
        }

        // Copy address on click
        this.overlay.querySelectorAll('.transfer-task-dialog-party-address').forEach((el) => {
            el.addEventListener('click', () => {
                const address = el.getAttribute('data-address');
                if (address) {
                    navigator.clipboard.writeText(address).catch(() => { });
                }
            });
        });

        // Copy recipient address on click
        this.overlay.querySelectorAll('.transfer-task-dialog-recipient-address').forEach((el) => {
            el.addEventListener('click', () => {
                const address = el.getAttribute('data-address');
                if (address) {
                    navigator.clipboard.writeText(address).catch(() => { });
                }
            });
        });

        // Copy TXID buttons
        this.overlay.querySelectorAll('.btn-copy-txid').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const txidEl = (e.target as HTMLElement).parentElement?.querySelector('.transfer-task-dialog-recipient-txid-text');
                if (txidEl) {
                    navigator.clipboard.writeText(txidEl.textContent || '').catch(() => { });
                }
            });
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Escape key to close
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Action bar listeners
        this.attachActionBarListeners();
    }

    /**
     * Check if action bar should be shown
     */
    private shouldShowActionBar(data: TransferTaskDetailData): boolean {
        return data.status === 'wait_for_sign' && !!data.signParams;
    }

    /**
     * Attach action bar event listeners
     */
    private attachActionBarListeners(): void {
        if (!this.overlay) return;

        const rejectBtn = this.overlay.querySelector('#dialog-reject-btn');
        const signBtn = this.overlay.querySelector('#dialog-sign-btn');

        rejectBtn?.addEventListener('click', () => {
            if (this.data) {
                this.options.onReject?.(this.data.taskId);
            }
        });

        signBtn?.addEventListener('click', () => {
            this.handleSign();
        });
    }

    /**
     * Handle sign button click
     */
    private async handleSign(): Promise<void> {
        if (this.isSigning || !this.data?.signParams) return;
        this.isSigning = true;
        this.updateSignButton('loading');

        try {
            const params = this.data.signParams;
            const signContent = JSON.parse(params.signContent);
            const signContentWithLayout = {
                ...signContent,
                layout: {
                    template: '',
                    keysMapStr: params.signContentKeyMapping || '{}'
                }
            };

            const signTask = {
                taskId: this.data.taskId.replace('#', ''),
                taskType: params.taskType,
                command: params.command,
                signContent: signContentWithLayout,
                validUntilTime: params.validUntilTime
            };

            const res = await signBySealx<{ signature: string }>(signTask);
            const signature = (res as { signature?: string })?.signature ?? '';

            if (!signature) {
                throw new Error('Signing failed: no signature returned');
            }

            this.updateSignButton('success');
            this.showToast('Signed successfully', 'success');
            this.options.onSign?.({ taskId: this.data.taskId, signature });
        } catch (e: any) {
            this.updateSignButton('error');
            const message = e?.message || 'Signing failed';
            this.showToast(message, 'error');
            this.options.onSignError?.(e instanceof Error ? e : new Error(message));
        } finally {
            closeSealx();
            this.isSigning = false;
        }
    }

    /**
     * Update sign button state
     */
    private updateSignButton(state: 'loading' | 'success' | 'error'): void {
        if (!this.overlay) return;
        const btn = this.overlay.querySelector('#dialog-sign-btn') as HTMLButtonElement;
        if (!btn) return;

        if (state === 'loading') {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.innerHTML = '<span class="transfer-task-dialog-sign-spinner"></span> Signing...';
        } else if (state === 'success') {
            btn.disabled = true;
            btn.classList.remove('loading');
            btn.innerHTML = 'Signed';
            btn.style.background = '#16a34a';
            setTimeout(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Sign';
                    btn.style.background = '';
                }
            }, 2000);
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = 'Sign';
            btn.style.background = '';
        }
    }

    /**
     * Show toast notification
     */
    private showToast(message: string, type: 'success' | 'error'): void {
        if (!this.overlay) return;

        const container = this.overlay.querySelector('.transfer-task-dialog-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `transfer-task-dialog-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

/**
 * Create and open a transfer task detail dialog
 * @param data Transfer task detail data
 * @param options Dialog options
 * @returns Dialog instance
 */
export function openTransferTaskDetailDialog(
    data: TransferTaskDetailData,
    options: TransferTaskDetailDialogOptions = {}
): TransferTaskDetailDialog {
    const dialog = new TransferTaskDetailDialog(options);
    dialog.open(data);
    return dialog;
}
