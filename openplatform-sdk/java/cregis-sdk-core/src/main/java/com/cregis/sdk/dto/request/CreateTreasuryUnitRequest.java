package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.AnyCallRule;
import com.cregis.sdk.dto.model.CoinDto;
import com.cregis.sdk.dto.model.FundControl;
import com.cregis.sdk.dto.model.WhitelistItem;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Create Treasury Unit request (创建财务单元).
 * Maps to OpenAPI `CreateProjectTreasuryUnitSmartRequest`.
 */
@Data
@Builder
public class CreateTreasuryUnitRequest {
    /** 财务单元名称 */
    private String unitName;
    /** 业务类型 */
    private String businessScope;
    /** 业务用途 */
    private String businessPurpose;
    /** 账本拓扑结构模型 */
    private String topology;
    /** 币种信息 */
    private List<CoinDto> coinIds;
    /** 自动签入地址 */
    private String autoSignUrl;
    /** 资金管理员 */
    private List<FundControl> primaryManager;
    /** 资金白名单 */
    private List<WhitelistItem> primaryWhiteList;
    /** 通用调用控制 */
    private List<AnyCallRule> primaryAnycallRules;
    /** 三方平台ecode */
    private String thirdPartyEcode;
    /** 备注 */
    private String remark;
    /** 出金管理员 */
    private List<FundControl> payoutManager;
    /** 收款账户通用调用控制 */
    private List<AnyCallRule> payinAnycallRules;
    /** 付款通用调用控制 */
    private List<AnyCallRule> payoutAnycallRules;
}
