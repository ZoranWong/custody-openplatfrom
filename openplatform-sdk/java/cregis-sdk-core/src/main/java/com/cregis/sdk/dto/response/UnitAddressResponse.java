package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Unit address response (单位地址).
 * Maps to OpenAPI `ProjectUnitAccountAddress`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnitAddressResponse {
    private Long id;
    private String ecode;
    private String vaultCode;
    private Long projectId;
    private String address;
    private String vaultAccountId;
    private Long cusAccountId;
    private Long treasuryUnitId;
    private String coinId;
    private String network;
    /** 系列: EVM/BTC/TRON/BRC20/SOL/POLKA/SUI/COSMOS/TON */
    private String series;
    private Integer addressIndex;
    private String alias;
    private Integer isSmart;
    /** 是否部署地址合约: 1.是, 0.否 */
    private Integer isContract;
    /** 地址状态: 1:待部署合约, 2:部署合约中, 3:部署成功可用, 4:冻结 */
    private Integer status;
    private String accountType;
    /** 是否可用: 1.可用, 0.不可用 */
    private Integer available;
    /** 该地址当前被隔离(hold)的合计金额，>0 时禁止归集 */
    private Long holdAmount;
    /** 是否因存在隔离资金而禁止归集: 1.禁止, 0.允许 */
    private Integer holdFrozen;
    private String riskLevel;
    private String riskScore;
    private String riskCheckTime;
    /** 有效时间,单位:小时 */
    private Integer expireTime;
    private String userId;
    private String lastUsedTime;
    private String coolingEndTime;
    private String createTime;
    private String updateTime;
}
