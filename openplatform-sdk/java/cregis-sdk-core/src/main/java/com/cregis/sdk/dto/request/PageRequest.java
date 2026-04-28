package com.cregis.sdk.dto.request;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Unified pagination query abstraction (0-based pageIndex/pageSize).
 */
@Data
@Builder
public class PageRequest {
    @Builder.Default
    private int pageIndex = 0;

    @Builder.Default
    private int pageSize = 20;

    private String sortFields;

    private List<QueryCondition> queryList;

    public static PageRequest of(int pageIndex, int pageSize) {
        return PageRequest.builder()
                .pageIndex(pageIndex)
                .pageSize(pageSize)
                .build();
    }

    /**
     * Convert 0-based pageIndex to 1-based pageNum for APIs that require it.
     */
    public int getPageNum() {
        return pageIndex + 1;
    }

    @Data
    @Builder
    public static class QueryCondition {
        private String key;
        private Object value;
        @Builder.Default
        private String oper = "=";
        @Builder.Default
        private String join = "and";
    }
}
