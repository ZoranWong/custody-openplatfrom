package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.FundControl;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Fund control update request (修改资金流控制规则).
 * Maps to OpenAPI `FundControlUpdateRequest`.
 */
@Data
@Builder
public class FundControlUpdateRequest {
    /** 账户id */
    private Long cusAccountId;
    /** 财务单元id */
    private Long treasuryUnitId;
    /** 资金管理员规则 */
    private List<FundControl> fundControls;
    /** 备注 */
    private String note;
}
