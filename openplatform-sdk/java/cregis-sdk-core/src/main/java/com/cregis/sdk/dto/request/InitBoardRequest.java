package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Initialize board request (初始化护卫队).
 * Maps to OpenAPI `ThirdInitBoardRequest`.
 */
@Data
@Builder
public class InitBoardRequest {
    /** 护卫队成员公钥 */
    private List<String> guardians;
    /** 护卫队的操作门限 */
    private Integer threshold;
    /** 签名的语言 */
    private String lang;
    /** 备注 */
    private String note;
}
