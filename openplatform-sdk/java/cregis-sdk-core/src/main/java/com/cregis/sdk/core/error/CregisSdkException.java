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
     * Creates an exception from an API error response.
     */
    public static CregisSdkException fromApiResponse(int serverCode, String message,
                                                      Integer httpStatusCode, String traceId) {
        SdkErrorCode sdkCode = mapServerErrorCode(serverCode);
        String fullMessage = "API error [" + serverCode + "]: " + message;
        return new CregisSdkException(sdkCode, fullMessage, serverCode, traceId, httpStatusCode);
    }

    /**
     * Maps server error codes to SDK error codes.
     */
    private static SdkErrorCode mapServerErrorCode(int serverCode) {
        // Code 0 means SUCCESS - return API_ERROR so caller can check serverCode == 0
        if (serverCode == 0) {
            return SdkErrorCode.API_ERROR;
        }
        return switch (serverCode / 1000) {
            case 400, 401 -> SdkErrorCode.API_ERROR;
            case 403 -> SdkErrorCode.API_ERROR;
            case 404 -> SdkErrorCode.API_ERROR;
            case 409 -> SdkErrorCode.API_ERROR;
            case 429 -> SdkErrorCode.API_ERROR;
            case 500 -> SdkErrorCode.API_ERROR;
            default -> SdkErrorCode.API_ERROR;
        };
    }
}
