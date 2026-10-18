package com.cregis.sdk.dto.request;

import com.cregis.sdk.dto.model.AccountFundControl;
import com.cregis.sdk.dto.model.CoinDto;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Add unit coins request (给财务单元添加币种/网络).
 * Maps to OpenAPI `AddUnitCoinsRequest`.
 */
@Data
@Builder
public class AddUnitCoinsRequest {
    /** 财务单元id */
    private Long treasuryUnitId;
    /** 币种信息 */
    private List<CoinDto> coinIds;
    /** 按账户维度的资金流规则，不传则只加币种、不改资金流 */
    private List<AccountFundControl> accountFundControls;
    /** 备注 */
    private String note;
}
