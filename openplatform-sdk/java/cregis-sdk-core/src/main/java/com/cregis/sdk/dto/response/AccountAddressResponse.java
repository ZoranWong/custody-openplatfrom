package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Address returned by the create-address APIs (新建地址).
 * Maps to OpenAPI `AccountAddressVO`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AccountAddressResponse {
    private Long id;
    private String ecode;
    private String vaultCode;
    private Long projectId;
    private String address;
    private String alias;
    /** trustVault 账户ID */
    private String accountId;
    private Long cusAccountId;
    private Long treasuryUnitId;
    private String coinId;
    private String network;
    private Integer isSmart;
    /** 是否部署地址合约: 1.是, 0.否 */
    private Integer isContract;
    /** 地址状态: 1:待部署合约, 2:部署合约中, 3:部署成功可用, 4:冻结 */
    private Integer status;
    /** 该地址当前被隔离(hold)的合计金额，>0 时禁止归集 */
    private Long holdAmount;
    private String riskLevel;
    private String riskScore;
    private String accountType;
    private String createTime;
    private String updateTime;
    private String balance;
}
