package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.WhitelistItem;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Whitelist update request (白名单设置).
 * Maps to OpenAPI `WhiteListUpdateRequest`.
 */
@Data
@Builder
public class WhitelistUpdateRequest {
    /** 新增白名单项 */
    private List<WhitelistItem> addItems;
    /** 移除白名单项 */
    private List<WhitelistItem> removeItems;
    /** 财务单元ID */
    private Long treasuryUnitId;
    /** 账户id */
    private Long cusAccountId;
    /** 是否启用白名单 */
    private String allowListEnabled;
    /** 语言 */
    private String lang;
    /** 备注 */
    private String note;
}
