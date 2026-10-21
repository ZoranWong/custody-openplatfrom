package com.cregis.sdk.core.callback;

/**
 * Business handler for a verified callback payload.
 * May throw on business failure; the caller decides how to surface it.
 */
@FunctionalInterface
public interface CallbackHandler {
    /**
     * Handle a verified callback payload.
     *
     * @param data  the business data (HTTP body)
     * @param event the event name from {@code X-Event} ({@code null} when the
     *              header is absent, e.g. the {@code authorizeUrl} callback path)
     */
    void handle(java.util.Map<String, Object> data, String event);
}
