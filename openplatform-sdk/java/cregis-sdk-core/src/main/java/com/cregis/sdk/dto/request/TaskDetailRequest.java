package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * Query task detail request (获取任务详情).
 * Maps to the `/api/thirdparty/task/detail` body: businessId / taskType (both required).
 */
@Data
@Builder
public class TaskDetailRequest {
    /** 业务标识 */
    private String businessId;
    /** 任务类型：资金 orders / 系统操作 issues */
    private String taskType;
}
