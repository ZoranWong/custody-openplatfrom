package com.cregis.sdk.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Audit task response (审批任务).
 * Maps to OpenAPI `WCCIPCmdAuditTask`.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AuditTaskResponse {
    private Long id;
    private String taskId;
    private String vaultCode;
    private Long projectId;
    private String accountId;
    private String accountType;
    private String submitter;
    private String ecode;
    private String cmdType;
    private Object cmdBasic;
    private Object cmdForm;
    private String businessId;
    private String state;
    private String businessType;
    private String taskType;
    private String createTime;
    private String updateTime;
    private String signContent;
    private String signContentKeyMapping;
    private Integer total;
    private Integer threshold;
    private List<String> signers;
    private String algoType;
    private String initiator;
    private String taskOperation;
    private Integer signersLevel;
    private String coinId;
    private String unitName;
    private String accountName;
    private List<String> includes;
    private Boolean sponsored;
    private String remark;
}
