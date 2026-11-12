package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * List audit tasks request (查询任务列表).
 * Maps to the `/api/thirdparty/treasury/tasks` body: pageNum / pageSize / businessId / taskType / taskId / state.
 */
@Data
@Builder
public class TaskListRequest {
    /** 页码，默认 1 */
    private Integer pageNum;
    /** 每页数量，默认 10 */
    private Integer pageSize;
    /** 订单 id */
    private String businessId;
    /** 任务类型：资金 orders / 系统操作 issues */
    private String taskType;
    /** 任务 id */
    private String taskId;
    /** 任务状态：AUDITING / REJECTED / ... / EXPIRED */
    private String state;
}
