package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

/**
 * List Treasury Units request (查询财务单元列表).
 * Maps to the `/api/thirdparty/treasury/list` body: pageNum / pageSize / sortFields.
 */
@Data
@Builder
public class ListTreasuryUnitsRequest {
    /** 页码，默认 1 */
    private Integer pageNum;
    /** 每页数量，默认 10 */
    private Integer pageSize;
    /** 排序字段，格式：字段名_asc/desc */
    private String sortFields;
}
