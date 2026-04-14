/**
 * Transfer Task Detail Dialog Styles
 * Tailwind CSS-based inline styles for the dialog component
 */

/**
 * Default dialog styles
 */
export const defaultDialogStyles = `
/* Base styles */
.transfer-task-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.transfer-task-dialog-container {
    position: relative;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
}

.transfer-task-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    flex-shrink: 0;
}

.transfer-task-dialog-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.transfer-task-dialog-back-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    border-radius: 6px;
    transition: all 0.2s;
}

.transfer-task-dialog-back-btn:hover {
    background: #e5e7eb;
    color: #6b7280;
}

.transfer-task-dialog-title {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 0;
}

.transfer-task-dialog-close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #f3f4f6;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s;
}

.transfer-task-dialog-close-btn:hover {
    background: #e5e7eb;
    color: #111827;
}

.transfer-task-dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* Grid layout */
.transfer-task-dialog-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
}

@media (max-width: 768px) {
    .transfer-task-dialog-grid {
        grid-template-columns: 1fr;
    }
}

/* Card styles */
.transfer-task-dialog-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.transfer-task-dialog-card-header {
    padding: 16px 20px;
    border-bottom: 1px solid #f3f4f6;
    background: #f9fafb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.transfer-task-dialog-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #111827;
    margin: 0;
}

.transfer-task-dialog-card-content {
    padding: 24px;
}

/* Status badge */
.transfer-task-dialog-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;
}

.transfer-task-dialog-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.transfer-task-dialog-status-dot.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Amount display */
.transfer-task-dialog-amount-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px dashed #e5e7eb;
    margin-bottom: 24px;
}

.transfer-task-dialog-amount-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
}

.transfer-task-dialog-amount-value {
    font-size: 30px;
    font-weight: 700;
    color: #111827;
    margin-top: 4px;
}

.transfer-task-dialog-amount-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
}

.transfer-task-dialog-network-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    color: #6b7280;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.transfer-task-dialog-contract {
    font-size: 10px;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
}

.transfer-task-dialog-contract:hover {
    color: #6b7280;
}

/* From/To section */
.transfer-task-dialog-from-to {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
    position: relative;
}

@media (max-width: 640px) {
    .transfer-task-dialog-from-to {
        grid-template-columns: 1fr;
    }
}

.transfer-task-dialog-connector {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
}

.transfer-task-dialog-connector-inner {
    width: 32px;
    height: 32px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.transfer-task-dialog-party-card {
    background: #ffffff;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    transition: border-color 0.2s;
}

.transfer-task-dialog-party-card:hover {
    border-color: #bfdbfe;
}

.transfer-task-dialog-party-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
}

.transfer-task-dialog-party-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.transfer-task-dialog-party-avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.transfer-task-dialog-party-avatar-gradient {
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    color: #ffffff;
}

.transfer-task-dialog-party-avatar-default {
    background: #f3f4f6;
    color: #6b7280;
    border: 1px solid #e5e7eb;
}

.transfer-task-dialog-party-name {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
}

.transfer-task-dialog-party-id {
    font-size: 12px;
    color: #6b7280;
}

.transfer-task-dialog-party-address-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
}

.transfer-task-dialog-party-address {
    font-size: 12px;
    font-family: monospace;
    color: #374151;
    background: #f9fafb;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.transfer-task-dialog-party-address:hover {
    background: #f3f4f6;
}

/* Travel Rule */
.transfer-task-dialog-travel-rule {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f3f4f6;
}

.transfer-task-dialog-travel-rule-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

.transfer-task-dialog-travel-rule-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3b82f6;
}

.transfer-task-dialog-travel-rule-label {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    text-transform: uppercase;
}

.transfer-task-dialog-travel-rule-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
}

.transfer-task-dialog-travel-rule-country {
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 4px;
}

.transfer-task-dialog-travel-rule-verified {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
}

.transfer-task-dialog-travel-rule-vasp {
    font-size: 10px;
    color: #9ca3af;
}

/* Proposal */
.transfer-task-dialog-proposal-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
    display: block;
}

.transfer-task-dialog-proposal-content {
    background: #f9fafb;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
}

/* Meta info */
.transfer-task-dialog-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;
}

@media (max-width: 640px) {
    .transfer-task-dialog-meta-grid {
        grid-template-columns: 1fr;
    }
}

.transfer-task-dialog-meta-item {
    display: flex;
    flex-direction: column;
}

.transfer-task-dialog-meta-label {
    font-size: 12px;
    color: #6b7280;
}

.transfer-task-dialog-meta-unit {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
}

.transfer-task-dialog-meta-unit-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #eff6ff;
    border: 1px solid #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
}

.transfer-task-dialog-meta-unit-name {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
}

.transfer-task-dialog-meta-value {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    margin-top: 4px;
}

.transfer-task-dialog-meta-value-warning {
    color: #ea580c;
}

/* Approval Flow */
.transfer-task-dialog-approval-flow {
    padding: 24px;
}

.transfer-task-dialog-approval-timeline {
    position: relative;
    padding-left: 24px;
    border-left: 2px solid #f3f4f6;
}

.transfer-task-dialog-approval-step {
    position: relative;
    padding-bottom: 32px;
}

.transfer-task-dialog-approval-step:last-child {
    padding-bottom: 0;
}

.transfer-task-dialog-approval-dot {
    position: absolute;
    left: -29px;
    top: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.transfer-task-dialog-approval-dot.completed {
    background: #22c55e;
}

.transfer-task-dialog-approval-dot.current {
    background: #f59e0b;
    box-shadow: 0 0 0 4px #fef3c7;
}

.transfer-task-dialog-approval-dot.pending {
    background: #e5e7eb;
}

.transfer-task-dialog-approval-check {
    width: 10px;
    height: 10px;
    color: #ffffff;
}

.transfer-task-dialog-approval-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
}

.transfer-task-dialog-approval-step.pending .transfer-task-dialog-approval-name {
    opacity: 0.5;
}

.transfer-task-dialog-approval-actor {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
}

.transfer-task-dialog-approval-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
    color: #6b7280;
}

.transfer-task-dialog-approval-actor-name {
    font-size: 12px;
    color: #6b7280;
}

.transfer-task-dialog-approval-timestamp {
    font-size: 10px;
    color: #9ca3af;
    margin-top: 4px;
}

.transfer-task-dialog-approval-note {
    font-size: 12px;
    color: #6b7280;
    background: #fef3c7;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #fde68a;
    margin-top: 8px;
}

.transfer-task-dialog-approval-status {
    font-size: 12px;
    font-weight: 500;
    margin-top: 8px;
}

.transfer-task-dialog-approval-status.passed {
    color: #16a34a;
}

.transfer-task-dialog-approval-pending-text {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 4px;
}

/* Multiple recipients */
.transfer-task-dialog-recipients-card {
    background: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    margin-top: 16px;
}

/* Multiple mode FROM card */
.transfer-task-dialog-from-card {
    background: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
}

.transfer-task-dialog-from-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 12px;
}

.transfer-task-dialog-from-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

.transfer-task-dialog-from-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.transfer-task-dialog-from-travel-rule {
    padding-left: 24px;
    border-left: 1px solid #f3f4f6;
}

.transfer-task-dialog-recipients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.transfer-task-dialog-recipients-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
}

.transfer-task-dialog-recipients-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}

.transfer-task-dialog-recipients-total {
    font-weight: 700;
    color: #111827;
}

.transfer-task-dialog-recipients-count {
    color: #6b7280;
}

/* Recipients search */
.transfer-task-dialog-recipients-search {
    position: relative;
    margin-bottom: 12px;
}

.transfer-task-dialog-recipients-search svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #94a3b8;
}

.transfer-task-dialog-recipients-search input {
    width: 100%;
    padding: 8px 12px 8px 40px;
    font-size: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    outline: none;
    transition: all 0.2s;
}

.transfer-task-dialog-recipients-search input:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.3);
    background: #ffffff;
}

.transfer-task-dialog-recipients-search input::placeholder {
    color: #94a3b8;
}

.transfer-task-dialog-recipients-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    // max-height: 256px;
    overflow-y: auto;
}

.transfer-task-dialog-recipient-item {
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #f3f4f6;
    transition: border-color 0.2s;
}

.transfer-task-dialog-recipient-item:hover {
    border-color: #e5e7eb;
}

.transfer-task-dialog-recipient-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.transfer-task-dialog-recipient-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.transfer-task-dialog-recipient-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
}

.transfer-task-dialog-recipient-name {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
}

.transfer-task-dialog-recipient-alias {
    font-size: 10px;
    color: #6b7280;
}

.transfer-task-dialog-recipient-amount {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
}

.transfer-task-dialog-recipient-details {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6b7280;
    margin-bottom: 8px;
}

.transfer-task-dialog-recipient-address {
    font-family: monospace;
    color: #374151;
    cursor: pointer;
}

.transfer-task-dialog-recipient-address:hover {
    color: #1f2937;
}

.transfer-task-dialog-recipient-txid {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.transfer-task-dialog-recipient-txid-text {
    font-family: monospace;
    color: #475569;
}

.transfer-task-dialog-explorer-link {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 500;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    transition: background 0.2s;
}

.transfer-task-dialog-explorer-link:hover {
    background: #dbeafe;
}
`;

/**
 * Inject styles into document head
 */
export function injectDialogStyles(): void {
    if (typeof document === 'undefined') return;

    const existingStyle = document.getElementById('transfer-task-dialog-styles');
    if (existingStyle) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'transfer-task-dialog-styles';
    styleElement.textContent = defaultDialogStyles;
    document.head.appendChild(styleElement);
}
