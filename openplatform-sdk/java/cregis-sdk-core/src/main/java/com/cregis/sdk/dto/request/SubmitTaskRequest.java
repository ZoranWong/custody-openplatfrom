package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Submit Task (approval/rejection) request.
 */
@Data
@Builder
public class SubmitTaskRequest {
    private java.util.Map<String, java.util.List<String>> signatures;
    private boolean confirmed;
}
