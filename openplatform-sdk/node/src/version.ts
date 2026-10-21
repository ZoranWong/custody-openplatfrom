/**
 * SDK identification constants, kept in one place so the User-Agent and
 * X-SDK-* headers stay in sync with package.json.
 */

/** npm package name */
export const SDK_NAME = '@cregis-kit/openplatform-node';

/** Package version — bump together with package.json */
export const SDK_VERSION = '1.2.0';

/** Implementation language reported to the gateway */
export const SDK_LANGUAGE = 'nodejs';
