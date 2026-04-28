package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Unified paginated response wrapper.
 * Backend returns: { records, total, current, size, pages }
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PageResponse<T> {
    private List<T> records;
    private int total;
    private int current;
    private int size;
    private int pages;
}
