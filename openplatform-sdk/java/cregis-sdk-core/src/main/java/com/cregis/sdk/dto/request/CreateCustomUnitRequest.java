package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.CoinDto;
import com.cregis.sdk.dto.model.CustomUnitDTO;
import com.cregis.sdk.dto.model.FundControl;
import com.cregis.sdk.dto.model.WhitelistRule;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Create Custom Unit request (创建自定义结构财务单元).
 * Maps to OpenAPI `CreateCustomUnitRequest`.
 */
@Data
@Builder
public class CreateCustomUnitRequest {
    /** 财务单元名称 */
    private String unitName;
    /** 账本拓扑结构模型 */
    private String topology;
    /** 业务类型 */
    private String businessScope;
    /** 是否合约账户 */
    private Boolean isSmart;
    /** 业务用途 */
    private String businessPurpose;
    /** 币种信息 */
    private List<CoinDto> coinIds;
    /** 账户信息 */
    private List<CustomUnitDTO> customUnitDTOs;
    /** 白名单规则设置 */
    private List<WhitelistRule> whitelistRules;
    /** 资金管理员 */
    private List<List<FundControl>> fundControls;
    /** 三方平台ecode */
    private String thirdPartyEcode;
    /** 备注 */
    private String remark;
}
