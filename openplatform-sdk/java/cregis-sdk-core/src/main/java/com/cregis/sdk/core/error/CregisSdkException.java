package com.cregis.sdk.core.error;

/**
 * SDK unified exception class.
 * All SDK errors are wrapped in this RuntimeException subclass.
 */
public class CregisSdkException extends RuntimeException {

    private final SdkErrorCode errorCode;
    private final Integer serverErrorCode;
    private final String requestId;
    private final Integer httpStatusCode;

    public CregisSdkException(SdkErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.serverErrorCode = null;
        this.requestId = null;
        this.httpStatusCode = null;
    }

    public CregisSdkException(SdkErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.serverErrorCode = null;
        this.requestId = null;
        this.httpStatusCode = null;
    }

    public CregisSdkException(SdkErrorCode errorCode, String message, Integer serverErrorCode) {
        super(message);
        this.errorCode = errorCode;
        this.serverErrorCode = serverErrorCode;
        this.requestId = null;
        this.httpStatusCode = null;
    }

    public CregisSdkException(SdkErrorCode errorCode, String message, Integer serverErrorCode,
                               String requestId, Integer httpStatusCode) {
        super(message);
        this.errorCode = errorCode;
        this.serverErrorCode = serverErrorCode;
        this.requestId = requestId;
        this.httpStatusCode = httpStatusCode;
    }

    public SdkErrorCode getErrorCode() {
        return errorCode;
    }

    public Integer getServerErrorCode() {
        return serverErrorCode;
    }

    public String getRequestId() {
        return requestId;
    }

    public Integer getHttpStatusCode() {
        return httpStatusCode;
    }

    /**
     * Returns message without exposing appSecret.
     */
    @Override
    public String getMessage() {
        String msg = super.getMessage();
        if (msg == null) {
            return errorCode.name();
        }
        return msg;
    }

    /**
     * Creates an exception from an API error response (gateway or custody code).
     */
    public static CregisSdkException fromApiResponse(int serverCode, String message,
                                                      Integer httpStatusCode, String traceId) {
        SdkErrorCode sdkCode = SdkErrorCode.fromServerCode(serverCode);
        CustodyErrorCodes custody = CustodyErrorCodes.fromCode(serverCode);
        String fullMessage = custody != null
                ? "Custody error [" + serverCode + "] " + custody.name() + ": " + message
                : "API error [" + serverCode + "]: " + message;
        return new CregisSdkException(sdkCode, fullMessage, serverCode, traceId, httpStatusCode);
    }

    /** Custody error constant for {@link #getServerErrorCode()}, or {@code null}. */
    public CustodyErrorCodes getCustodyError() {
        return serverErrorCode == null ? null : CustodyErrorCodes.fromCode(serverErrorCode);
    }

    /** Symbolic name (e.g. {@code BOARD_NOT_EXIST}) for custody codes, else {@code null}. */
    public String getCustodyErrorName() {
        CustodyErrorCodes custody = getCustodyError();
        return custody == null ? null : custody.name();
    }

    /** Human-readable meaning of the custody code, or {@code null}. */
    public String getCustodyErrorMeaning() {
        CustodyErrorCodes custody = getCustodyError();
        return custody == null ? null : custody.getMeaning();
    }

    /** Whether a plain retry can help for this custody code ({@code false} otherwise). */
    public boolean isCustodyErrorRetryable() {
        CustodyErrorCodes custody = getCustodyError();
        return custody != null && custody.isRetryable();
    }

    /** HTTP-status based retry heuristic, used for non-custody errors. */
    public boolean isHttpRetryable() {
        return httpStatusCode != null && (httpStatusCode >= 500 || httpStatusCode == 0);
    }

    /** True when the error looks retryable (custody flag takes precedence). */
    public boolean isRetryable() {
        CustodyErrorCodes custody = getCustodyError();
        if (custody != null) {
            return custody.isRetryable();
        }
        return errorCode.isRetryableCode() || isHttpRetryable();
    }
}
