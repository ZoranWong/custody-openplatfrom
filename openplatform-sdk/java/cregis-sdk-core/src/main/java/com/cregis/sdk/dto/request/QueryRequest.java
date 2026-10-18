package com.cregis.sdk.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Unified paginated query request (分页查询通用请求体).
 * Maps to OpenAPI `QueryParamProjectUnit*` (pageIndex/pageSize/sortFields/queryList).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class QueryRequest {
    /** 页码 */
    private Integer pageIndex;
    /** 每页数量 */
    private Integer pageSize;
    /** 排序字段，格式为: colume_d(倒序)/colume_a(正序) */
    private String sortFields;
    /** 查询条件 */
    private List<QueryCondition> queryList;

    /**
     * Single query condition. Maps to OpenAPI `QueryCondition`.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QueryCondition {
        private String key;
        private Object value;
        private String oper;
        private String join;
    }
}
