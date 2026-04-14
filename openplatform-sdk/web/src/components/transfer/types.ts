/**
 * Transfer Task Detail Dialog Types
 * Types for the Transfer task detail popup dialog component
 */

/**
 * Dialog options for customization
 */
export interface TransferTaskDetailDialogOptions {
    /** Dialog title (optional) */
    title?: string;
    /** Custom CSS class for dialog container */
    className?: string;
    /** Callback when dialog is closed */
    onClose?: () => void;
}

/**
 * Transfer party information (sender or receiver)
 */
export interface TransferParty {
    /** Display name */
    name: string;
    /** Account alias (optional) */
    alias?: string;
    /** Account ID (optional) */
    id?: string;
    /** Wallet address */
    address: string;
    /** Account type */
    type?: 'account' | 'external';
    /** Avatar letter (first letter of name) */
    avatarLetter?: string;
    /** Travel Rule information (optional) */
    travelRule?: TravelRuleItem;
}

export interface TravelRuleItem {
    name: string;
    country: string;
    verified: boolean;
    vasp?: string;
}
/**
 * Travel Rule information
 */
export interface TravelRuleInfo {
    /** Originator information */
    originator?: TravelRuleItem;
    /** Beneficiary information */
    beneficiary?: TravelRuleItem;
}

/**
 * Approval flow step
 */
export interface ApprovalStep {
    /** Step name */
    name: string;
    /** Step status */
    status: 'completed' | 'current' | 'pending';
    /** Actor name (optional) */
    actor?: string;
    /** Actor avatar letters (optional, e.g., "JD" for John Doe) */
    actorAvatar?: string;
    /** Timestamp (optional) */
    timestamp?: string;
    /** Additional note (optional) */
    note?: string;
}

/**
 * Meta information for the task
 */
export interface TransferTaskMeta {
    /** Treasury unit name */
    unit: string;
    /** Creation timestamp */
    createdAt: string;
    /** Expiration time remaining */
    expiresIn: string;
}

/**
 * Complete transfer task detail data
 */
export interface TransferTaskDetailData {
    /** Task ID (e.g., #TRX-8829) */
    taskId: string;
    /** Task status */
    status: 'pending' | 'approved' | 'rejected' | 'wait_for_sign';
    /** Transfer amount */
    amount: string;
    /** Coin symbol (e.g., USDT) */
    coin: string;
    /** Network name (e.g., Ethereum) */
    network: string;
    /** Contract address (optional) */
    contractAddress?: string;
    /** Sender information */
    from: TransferParty;
    /** Recipient information (single or array for multiple) */
    to: TransferParty | TransferParty[];
    /** Proposal/Note text (optional) */
    proposal?: string;
    /** Meta information */
    meta: TransferTaskMeta;
    /** Approval flow steps */
    approvalFlow: ApprovalStep[];
}

/**
 * Status display configuration
 */
export const StatusConfig = {
    pending: {
        label: 'Pending',
        className: 'bg-gray-50 text-gray-700 border-gray-100',
        dotClass: 'bg-gray-400',
    },
    wait_for_sign: {
        label: 'Wait for Sign',
        className: 'bg-amber-50 text-amber-700 border-amber-100',
        dotClass: 'bg-amber-500 animate-pulse',
    },
    approved: {
        label: 'Approved',
        className: 'bg-green-50 text-green-700 border-green-100',
        dotClass: 'bg-green-500',
    },
    rejected: {
        label: 'Rejected',
        className: 'bg-red-50 text-red-700 border-red-100',
        dotClass: 'bg-red-500',
    },
} as const;

/**
 * Get status display info
 */
export function getStatusDisplay(status: TransferTaskDetailData['status']) {
    return StatusConfig[status] || StatusConfig.pending;
}
