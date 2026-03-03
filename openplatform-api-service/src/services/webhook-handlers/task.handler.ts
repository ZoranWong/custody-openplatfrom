/**
 * Task Event Handler
 * Handles task-related webhook events (signatures, approvals, etc.)
 */

import {
  WebhookEvent,
  WebhookPayload,
  WebhookEventType,
} from '../../types/webhook.types';

/**
 * Task event data structure
 */
interface TaskEventData {
  taskId: string;
  taskType: string;
  status: 'created' | 'signed' | 'rejected';
  enterpriseId: string;
  createdBy: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handle task.created event
 */
export async function handleTaskCreated(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const taskData = event.data as unknown as TaskEventData;

  console.log(
    `[TaskHandler] Processing task.created: ${taskData.taskId}, Type: ${taskData.taskType}`
  );

  // Business logic for task created
  // - Create task record
  // - Assign to appropriate user
  // - Send notification to assignee
  // - Start deadline timer

  // Example business logic:
  // await taskService.createTask(taskData);
  // await notificationService.sendTaskAssignedNotification(taskData.assignedTo, taskData);
}

/**
 * Handle task.signed event
 */
export async function handleTaskSigned(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const taskData = event.data as unknown as TaskEventData;

  console.log(
    `[TaskHandler] Processing task.signed: ${taskData.taskId}, Type: ${taskData.taskType}`
  );

  // Business logic for task signed
  // - Update task status
  // - Store signature
  // - Trigger next step in workflow
  // - Notify relevant parties

  // Example business logic:
  // await taskService.updateStatus(taskData.taskId, 'signed');
  // await signatureService.storeSignature(taskData.taskId, event.data.signature);
  // await workflowService.triggerNextStep(taskData);
  // await notificationService.sendTaskSignedNotification(taskData.createdBy, taskData);
}

/**
 * Handle task.rejected event
 */
export async function handleTaskRejected(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const taskData = event.data as unknown as TaskEventData;

  console.log(
    `[TaskHandler] Processing task.rejected: ${taskData.taskId}, Type: ${taskData.taskType}`
  );

  // Business logic for task rejected
  // - Update task status
  // - Store rejection reason
  // - Notify creator
  // - Handle escalation if needed

  // Example business logic:
  // await taskService.updateStatus(taskData.taskId, 'rejected');
  // await taskService.storeRejectionReason(taskData.taskId, event.data.reason);
  // await notificationService.sendTaskRejectedNotification(taskData.createdBy, taskData);
}

/**
 * Get task handler for specific event type
 */
export function getTaskHandler(eventType: WebhookEventType): ((event: WebhookEvent, payload: WebhookPayload) => Promise<void>) | null {
  switch (eventType) {
    case 'task.created':
      return handleTaskCreated;
    case 'task.signed':
      return handleTaskSigned;
    case 'task.rejected':
      return handleTaskRejected;
    default:
      return null;
  }
}

/**
 * Register all task handlers
 */
export function registerTaskHandlers(
  registerHandler: (type: WebhookEventType, handler: (event: WebhookEvent, payload: WebhookPayload) => Promise<void>) => void
): void {
  registerHandler('task.created', handleTaskCreated);
  registerHandler('task.signed', handleTaskSigned);
  registerHandler('task.rejected', handleTaskRejected);
}
