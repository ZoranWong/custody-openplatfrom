/**
 * API log row categories.
 *
 * Outbound callback pushes are recorded in `api_logs` alongside inbound API
 * calls (apiName `callback.push` per attempt, `callback.push.summary` for the
 * overall result). The prefix is the discriminator used to separate the two
 * views without adding a column.
 */
export const CALLBACK_API_NAME_PREFIX = 'callback.push';

/** Whether a log's apiName identifies an outbound callback push. */
export function isCallbackApiName(apiName: string | null | undefined): boolean {
  return typeof apiName === 'string' && apiName.startsWith(CALLBACK_API_NAME_PREFIX);
}
