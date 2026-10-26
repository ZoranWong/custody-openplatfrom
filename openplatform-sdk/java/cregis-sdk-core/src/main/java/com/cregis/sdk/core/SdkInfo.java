package com.cregis.sdk.core;

/**
 * SDK identification constants. The gateway records these (from the
 * User-Agent / X-SDK-* request headers) in its API logs, so keep them in
 * sync with the version declared in pom.xml.
 */
public final class SdkInfo {

    /** Maven coordinates (groupId:artifactId) */
    public static final String SDK_NAME = "com.cregis:cregis-sdk-core";

    /** SDK version — bump together with pom.xml */
    public static final String SDK_VERSION = "1.2.4";

    /** Implementation language reported to the gateway */
    public static final String SDK_LANGUAGE = "java";

    /** User-Agent header value */
    public static final String USER_AGENT =
            SDK_NAME + "/" + SDK_VERSION + " (" + SDK_LANGUAGE + ")";

    private SdkInfo() {
    }
}
