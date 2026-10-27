package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Update board request (修改护卫队).
 * Maps to OpenAPI `UpdateBoardRequest`.
 */
@Data
@Builder
public class UpdateBoardRequest {
    /** 护卫队成员公钥；不传则保持原成员 */
    private List<String> guardians;
    /** 护卫队的操作门限；不传则保持原门限 */
    private Integer threshold;
    /** 签名的语言 */
    private String lang;
    /** 备注 */
    private String note;
    /** 签名有效期，单位**分钟**（custody 默认 1440） */
    private Integer validUntilTime;
}
