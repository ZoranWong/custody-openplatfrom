package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.PayTo;
import com.cregis.sdk.dto.model.TravelRuleRequest;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Create Payout request (出金操作).
 * Maps to OpenAPI `ThirdPayoutRequest`.
 */
@Data
@Builder
public class CreatePayoutRequest {
    /** 出金地址及信息列表 */
    private List<PayTo> payTo;
    /** 出金账户id */
    private Long fromAccountId;
    /** 出金财务单元ID */
    private Long unitId;
    /** 币种ID */
    private String coinId;
    /** 网络 */
    private String network;
    /** 操作类型: withdraw/allocate/payout */
    private String operation;
    /** 出金账户地址 */
    private String fromAddress;
    /** 目标账户ID (allocate 必须) */
    private Long toCusAccountId;
    /** 发起用户名 */
    private String username;
    /** 发起用户ID */
    private String userId;
    /** 客户业务订单ID */
    private String orderId;
    /** 备注 */
    private String note;
    /** 语言 */
    private String lang;
    /** 任务发起人 */
    private String initiator;
    /** 业务类型 */
    private String merchantType;
    /** Travel Rule信息 */
    private TravelRuleRequest travelRule;
}
