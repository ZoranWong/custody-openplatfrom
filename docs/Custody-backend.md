---
title: 默认模块
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# 默认模块

Base URLs:

# Authentication

# Third-Party 财务单元管理

## POST Create a new treasure unit

POST /api/third-party/create/{resourceAccessKey}

Create a new treasure unit
Creates a new financial unit under the merchant associated with the API Key.

> Body Parameters

```json
{
  "businessScope": "DEDICATED_ACCOUNT",
  "topology": "ORBIT",
  "coinIds": "##default",
  "autoSignUrl": "##default",
  "primaryManager": "##default",
  "primaryAnycallRules": "##default",
  "thirdPartyEcode": "##default",
  "payoutManager": "##default",
  "payinAnycallRules": "##default",
  "riskManager": "##default",
  "payoutAnycallRules": "##default",
  "riskAnycallRules": "##default"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |none|
|body|body|[CreateProjectTreasuryUnitSmartRequest](#schemacreateprojecttreasuryunitsmartrequest)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "custodialBusinessScope": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 0,
    "name": "",
    "ecode": "",
    "vaultCode": "",
    "groupCode": "",
    "networks": [
      ""
    ],
    "status": "",
    "gmaId": "",
    "caaFactoryAddresses": [
      {
        "network": "",
        "address": ""
      }
    ],
    "factoryStatus": 0,
    "sort": 0,
    "remark": "",
    "createTime": "",
    "updateTime": ""
  }
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultMerchantProject](#schemamessageresultmerchantproject)|

## POST List treasure units

POST /api/third-party/list/{resourceAccessKey}

List treasure units
Lists all financial units created by the developer under the authorized merchant.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": [
    {
      "id": 0,
      "ecode": "",
      "projectId": 0,
      "name": "",
      "merchantType": "",
      "coinIds": [
        {
          "coinId": "",
          "network": ""
        }
      ],
      "accounts": [
        {
          "account_name": "",
          "account_type": ""
        }
      ],
      "status": "",
      "sort": 0,
      "creationType": "",
      "developerId": "",
      "remark": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

```json
{
  "code": 0,
  "message": "",
  "data": [
    {
      "id": 0,
      "ecode": "",
      "projectId": 0,
      "name": "",
      "ubo": "",
      "custodyServiceMode": "",
      "coinIds": [
        {
          "coinId": "",
          "network": ""
        }
      ],
      "accounts": [
        {
          "account_name": "",
          "account_type": ""
        }
      ],
      "status": "",
      "sort": 0,
      "creationType": "",
      "developerId": "",
      "remark": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

```json
{
  "code": 0,
  "message": "",
  "data": [
    {
      "id": 0,
      "ecode": "",
      "projectId": 0,
      "name": "",
      "ubo": "",
      "custodyServiceMode": "",
      "coinIds": [
        {
          "coinId": "",
          "network": ""
        }
      ],
      "accounts": [
        {
          "account_name": "",
          "account_type": ""
        }
      ],
      "status": "",
      "sort": 0,
      "creationType": "",
      "developerId": "",
      "remark": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

```json
{
  "code": 0,
  "message": "",
  "data": [
    {
      "id": 0,
      "ecode": "",
      "projectId": 0,
      "name": "",
      "ubo": "",
      "custodyServiceMode": "",
      "coinIds": [
        {
          "coinId": "",
          "network": ""
        }
      ],
      "accounts": [
        {
          "account_name": "",
          "account_type": ""
        }
      ],
      "status": "",
      "sort": 0,
      "creationType": "",
      "developerId": "",
      "remark": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

```json
{
  "code": 0,
  "message": "",
  "data": [
    {
      "id": 0,
      "ecode": "",
      "projectId": 0,
      "name": "",
      "ubo": "",
      "custodyServiceMode": "",
      "coinIds": [
        {
          "coinId": "",
          "network": ""
        }
      ],
      "accounts": [
        {
          "account_name": "",
          "account_type": ""
        }
      ],
      "status": "",
      "sort": 0,
      "creationType": "",
      "developerId": "",
      "remark": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultListProjectUnit](#schemamessageresultlistprojectunit)|

## POST Get treasure unit address

POST /api/third-party/get-unit-address/{resourceAccessKey}

Get treasure unit address

> Body Parameters

```json
{
  "accountType": "FREEZE",
  "pageSize": 0,
  "pageNum": 0,
  "coinId": "##default",
  "network": "##default",
  "unitId": 0
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |none|
|body|body|[ThirdAddressRequest](#schemathirdaddressrequest)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResult?](#schemamessageresult?)|

## POST Get treasure unit address

POST /api/third-party/payout/{resourceAccessKey}

Get treasure unit address

> Body Parameters

```json
{
  "payTo": "##default",
  "from": "##default",
  "unitId": 0,
  "coinId": "##default",
  "network": "##default",
  "operation": "##default",
  "username": "##default",
  "userId": "##default",
  "orderId": "##default",
  "note": "##default",
  "lang": "##default",
  "merchantType": "NON_FINANCIAL_CORPORATE",
  "travelRule": "##default"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |none|
|body|body|[ThirdPayoutRequest](#schemathirdpayoutrequest)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResult?](#schemamessageresult?)|

## POST 任务提交接口,针对三方平台使用

POST /api/third-party/submit/task/{resourceAccessKey}/{taskId}

一次直接提交

> Body Parameters

```json
{
  "signatures": "##default",
  "confirmed": false
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |none|
|taskId|path|string| yes |none|
|body|body|[SubmitTaskDTO](#schemasubmittaskdto)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResult?](#schemamessageresult?)|

## POST Query activities with pagination

POST /api/third-party/activities/{resourceAccessKey}

分页查询活动记录
Query activities with pagination
Query activity records under the financial unit, including all fund activities such as pay-in, pay-out, transfer, etc.

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |资源访问密钥|
|body|body|[QueryParamProjectUnitActivity](#schemaqueryparamprojectunitactivity)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "records": [
      {
        "id": 0,
        "ecode": "",
        "projectId": 0,
        "treasuryUnitId": 0,
        "cusAccountId": 0,
        "accountType": "",
        "cpAccountId": 0,
        "coinId": "",
        "network": "",
        "type": "",
        "amount": 0,
        "direction": "",
        "orderId": "",
        "businessId": "",
        "status": "",
        "travelRuleStatus": "",
        "kytStatus": "",
        "createTime": "",
        "updateTime": ""
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "",
        "asc": false
      }
    ],
    "optimizeCountSql": false,
    "searchCount": false,
    "optimizeJoinOfCountSql": false,
    "maxLimit": 0,
    "countId": ""
  }
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultPageProjectUnitActivity](#schemamessageresultpageprojectunitactivity)|

## POST Query transfer-out orders with pagination

POST /api/third-party/transfer-out-orders/{resourceAccessKey}

分页查询出金订单
Query transfer-out orders with pagination
Query transfer-out orders under the financial unit, including withdrawal and allocation orders.

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |资源访问密钥|
|body|body|[QueryParamProjectUnitTransferOutOrder](#schemaqueryparamprojectunittransferoutorder)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "records": [
      {
        "ecode": "",
        "vaultCode": "",
        "projectId": 0,
        "cusAccountId": 0,
        "address": "",
        "coinId": "",
        "network": "",
        "businessScope": "",
        "travelRuleReferenceId": "",
        "travelRulePayload": "",
        "travelRuleStatus": "",
        "travelRuleCheckStatus": "",
        "travelRuleCheckPayload": "",
        "kytStatus": "",
        "kytRiskScore": 0,
        "kytPayload": "",
        "complianceProvider": "",
        "orderId": "",
        "txId": "",
        "fee": "",
        "createTime": "",
        "updateTime": "",
        "id": 0,
        "taskId": "",
        "inputAmount": "",
        "totalAmount": 0,
        "fundFlowCode": "",
        "orderState": "",
        "payToList": [
          {
            "to": "",
            "amount": 0
          }
        ],
        "note": "",
        "businessId": ""
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "",
        "asc": false
      }
    ],
    "optimizeCountSql": false,
    "searchCount": false,
    "optimizeJoinOfCountSql": false,
    "maxLimit": 0,
    "countId": ""
  }
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultPageProjectUnitTransferOutOrder](#schemamessageresultpageprojectunittransferoutorder)|

## POST Query transfer-in orders with pagination

POST /api/third-party/transfer-in-orders/{resourceAccessKey}

分页查询入金订单
Query transfer-in orders with pagination
Query transfer-in orders under the financial unit, including deposit and collection orders.

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |资源访问密钥|
|body|body|[QueryParamProjectUnitTransferInOrder](#schemaqueryparamprojectunittransferinorder)| no |none|

> Response Examples

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": null
}
```

```json
{
  "code": 0,
  "message": "",
  "data": {
    "records": [
      {
        "ecode": "",
        "vaultCode": "",
        "projectId": 0,
        "cusAccountId": 0,
        "address": "",
        "coinId": "",
        "network": "",
        "businessScope": "",
        "travelRuleReferenceId": "",
        "travelRulePayload": "",
        "travelRuleStatus": "",
        "travelRuleCheckStatus": "",
        "travelRuleCheckPayload": "",
        "kytStatus": "",
        "kytRiskScore": 0,
        "kytPayload": "",
        "complianceProvider": "",
        "orderId": "",
        "txId": "",
        "fee": "",
        "createTime": "",
        "updateTime": "",
        "id": 0,
        "cpAddress": "",
        "amount": 0,
        "orderState": "",
        "type": 0,
        "note": "",
        "initiator": 0
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "",
        "asc": false
      }
    ],
    "optimizeCountSql": false,
    "searchCount": false,
    "optimizeJoinOfCountSql": false,
    "maxLimit": 0,
    "countId": ""
  }
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultPageProjectUnitTransferInOrder](#schemamessageresultpageprojectunittransferinorder)|

## POST Query fund records with pagination

POST /api/third-party/fund-records/{resourceAccessKey}

分页查询资金流水
Query fund records with pagination
Query fund flow records under the financial unit, recording details of each fund change.

> Body Parameters

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|resourceAccessKey|path|string| yes |资源访问密钥|
|body|body|[QueryParamProjectUnitFundRecord](#schemaqueryparamprojectunitfundrecord)| no |none|

> Response Examples

> 200 Response

```json
{
  "code": 0,
  "message": "",
  "data": {
    "records": [
      {
        "id": 0,
        "ecode": "",
        "projectId": 0,
        "treasuryUnitId": 0,
        "cusAccountId": 0,
        "txId": "",
        "coinId": "",
        "network": "",
        "amount": 0,
        "preBalance": 0,
        "postBalance": 0,
        "fee": "",
        "txType": "",
        "createTime": ""
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "",
        "asc": false
      }
    ],
    "optimizeCountSql": false,
    "searchCount": false,
    "optimizeJoinOfCountSql": false,
    "maxLimit": 0,
    "countId": ""
  }
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[MessageResultPageProjectUnitFundRecord](#schemamessageresultpageprojectunitfundrecord)|

# Data Schema

<h2 id="tocS_CreateProjectTreasuryUnitSmartRequest">CreateProjectTreasuryUnitSmartRequest</h2>

<a id="schemacreateprojecttreasuryunitsmartrequest"></a>
<a id="schema_CreateProjectTreasuryUnitSmartRequest"></a>
<a id="tocScreateprojecttreasuryunitsmartrequest"></a>
<a id="tocscreateprojecttreasuryunitsmartrequest"></a>

```json
{
  "businessScope": "DEDICATED_ACCOUNT",
  "topology": "ORBIT",
  "coinIds": "##default",
  "autoSignUrl": "##default",
  "primaryManager": "##default",
  "primaryAnycallRules": "##default",
  "thirdPartyEcode": "##default",
  "payoutManager": "##default",
  "payinAnycallRules": "##default",
  "riskManager": "##default",
  "payoutAnycallRules": "##default",
  "riskAnycallRules": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|businessScope|string|true|none||业务类型|
|topology|string|true|none||账本拓扑结构模型（决定底层建立几个账户）|
|coinIds|[[CoinDto](#schemacoindto)]|true|none||币种信息|
|autoSignUrl|string|false|none||自动签入地址|
|primaryManager|[[FundControl](#schemafundcontrol)]|true|none||资金管理员|
|primaryAnycallRules|[[AnyCallRule](#schemaanycallrule)]|false|none||通用调用控制信息|
|thirdPartyEcode|string|false|none||三方平台ecode，用于标识三方平台身份|
|payoutManager|[[FundControl](#schemafundcontrol)]|true|none||出金管理员|
|payinAnycallRules|[[AnyCallRule](#schemaanycallrule)]|false|none||收款账户通用调用控制信息|
|riskManager|[[FundControl](#schemafundcontrol)]|true|none||风控管理员|
|payoutAnycallRules|[[AnyCallRule](#schemaanycallrule)]|false|none||付款通用调用控制信息|
|riskAnycallRules|[[AnyCallRule](#schemaanycallrule)]|false|none||风控账户出金通用调用控制信息|

#### Enum

|Name|Value|
|---|---|
|businessScope|DEDICATED_ACCOUNT|
|businessScope|OMNIBUS_ACCOUNT|
|businessScope|OPEN_API_PROXY|
|topology|ORBIT|
|topology|SINGLE_GENERAL|
|topology|QUAD_SMART_ISOLATION|

<h2 id="tocS_MessageResult?">MessageResult?</h2>

<a id="schemamessageresult?"></a>
<a id="schema_MessageResult?"></a>
<a id="tocSmessageresult?"></a>
<a id="tocsmessageresult?"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": null
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|null|false|none||none|

<h2 id="tocS_CoinDto">CoinDto</h2>

<a id="schemacoindto"></a>
<a id="schema_CoinDto"></a>
<a id="tocScoindto"></a>
<a id="tocscoindto"></a>

```json
{
  "coinId": "##default",
  "network": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|coinId|string|false|none||币种ID|
|network|string|false|none||网络|

<h2 id="tocS_ProjectUnitActivity">ProjectUnitActivity</h2>

<a id="schemaprojectunitactivity"></a>
<a id="schema_ProjectUnitActivity"></a>
<a id="tocSprojectunitactivity"></a>
<a id="tocsprojectunitactivity"></a>

```json
{
  "id": 0,
  "ecode": "##default",
  "projectId": 0,
  "treasuryUnitId": 0,
  "cusAccountId": 0,
  "accountType": "##default",
  "cpAccountId": 0,
  "coinId": "##default",
  "network": "##default",
  "type": "##default",
  "amount": "##default",
  "direction": "##default",
  "orderId": "##default",
  "businessId": "##default",
  "status": "##default",
  "travelRuleStatus": "NOT_REQUIRED",
  "kytStatus": "NOT_REQUIRED",
  "createTime": "string",
  "updateTime": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||none|
|ecode|string|false|none||商户号|
|projectId|integer(int64)|false|none||项目ID|
|treasuryUnitId|integer(int64)|false|none||账户单元ID|
|cusAccountId|integer(int64)|false|none||发生交易的账户ID,出金就是from账户id,入金就是to账户id,这里是TrustVault账户id|
|accountType|string|false|none||发生交易的账户名称出金就是from账户名,入金就是to账户名|
|cpAccountId|integer(int64)|false|none||对向账户ID,与accountId对应,这里是Custody账户id|
|coinId|string|false|none||币种ID|
|network|string|false|none||网络|
|type|string|false|none||活动类型|
|amount|integer|false|none||活动金额|
|direction|string|false|none||资金流转方向:IN/OUT|
|orderId|string|false|none||活动所属订单号|
|businessId|string|false|none||第三方业务订单ID|
|status|string|false|none||状态|
|travelRuleStatus|string|false|none||Travel Rule 状态|
|kytStatus|string|false|none||KYT 状态|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||更新时间|

#### Enum

|Name|Value|
|---|---|
|travelRuleStatus|NOT_REQUIRED|
|travelRuleStatus|PENDING|
|travelRuleStatus|PASSED|
|travelRuleStatus|FAILED|
|travelRuleStatus|REVIEW|
|kytStatus|NOT_REQUIRED|
|kytStatus|PENDING|
|kytStatus|PASSED|
|kytStatus|FAILED|
|kytStatus|REVIEW|

<h2 id="tocS_FundControlRule">FundControlRule</h2>

<a id="schemafundcontrolrule"></a>
<a id="schema_FundControlRule"></a>
<a id="tocSfundcontrolrule"></a>
<a id="tocsfundcontrolrule"></a>

```json
{
  "guardians": [
    "string"
  ],
  "threshold": "string",
  "perTransferLimit": "string",
  "dailyTransferLimit": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|guardians|[string]|true|none||护卫队成员|
|threshold|string|true|none||护卫队的操作门限|
|perTransferLimit|string|true|none||单笔限额|
|dailyTransferLimit|string|true|none||单日限额|

<h2 id="tocS_OrderItem">OrderItem</h2>

<a id="schemaorderitem"></a>
<a id="schema_OrderItem"></a>
<a id="tocSorderitem"></a>
<a id="tocsorderitem"></a>

```json
{
  "column": "string",
  "asc": true
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|column|string|false|none||none|
|asc|boolean|false|none||none|

<h2 id="tocS_FundControl">FundControl</h2>

<a id="schemafundcontrol"></a>
<a id="schema_FundControl"></a>
<a id="tocSfundcontrol"></a>
<a id="tocsfundcontrol"></a>

```json
{
  "coinId": "string",
  "fundControlRules": [
    {
      "guardians": [
        "string"
      ],
      "threshold": "string",
      "perTransferLimit": "string",
      "dailyTransferLimit": "string"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|coinId|string|true|none||币种名称|
|fundControlRules|[[FundControlRule](#schemafundcontrolrule)]|true|none||金额约束信息|

<h2 id="tocS_PageProjectUnitActivity">PageProjectUnitActivity</h2>

<a id="schemapageprojectunitactivity"></a>
<a id="schema_PageProjectUnitActivity"></a>
<a id="tocSpageprojectunitactivity"></a>
<a id="tocspageprojectunitactivity"></a>

```json
{
  "records": [
    {
      "id": 0,
      "ecode": "##default",
      "projectId": 0,
      "treasuryUnitId": 0,
      "cusAccountId": 0,
      "accountType": "##default",
      "cpAccountId": 0,
      "coinId": "##default",
      "network": "##default",
      "type": "##default",
      "amount": "##default",
      "direction": "##default",
      "orderId": "##default",
      "businessId": "##default",
      "status": "##default",
      "travelRuleStatus": "NOT_REQUIRED",
      "kytStatus": "NOT_REQUIRED",
      "createTime": "string",
      "updateTime": "string"
    }
  ],
  "total": 0,
  "size": 0,
  "current": 0,
  "orders": [
    {
      "column": "string",
      "asc": true
    }
  ],
  "optimizeCountSql": true,
  "searchCount": true,
  "optimizeJoinOfCountSql": true,
  "maxLimit": 0,
  "countId": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|records|[[ProjectUnitActivity](#schemaprojectunitactivity)]|false|none||none|
|total|integer(int64)|false|none||none|
|size|integer(int64)|false|none||none|
|current|integer(int64)|false|none||none|
|orders|[[OrderItem](#schemaorderitem)]|false|none||none|
|optimizeCountSql|boolean|false|none||none|
|searchCount|boolean|false|none||none|
|optimizeJoinOfCountSql|boolean|false|none||none|
|maxLimit|integer(int64)|false|none||none|
|countId|string|false|none||none|

<h2 id="tocS_AnyCallRule">AnyCallRule</h2>

<a id="schemaanycallrule"></a>
<a id="schema_AnyCallRule"></a>
<a id="tocSanycallrule"></a>
<a id="tocsanycallrule"></a>

```json
{
  "guardians": [
    "string"
  ],
  "threshold": "string",
  "allowedCommands": [
    "string"
  ],
  "allowed_commands": [
    "string"
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|guardians|[string]|true|none||护卫队成员|
|threshold|string|true|none||护卫队的操作门限|
|allowedCommands|[string]|true|none||允许执行的指令列表|
|allowed_commands|[string]|false|none||none|

<h2 id="tocS_MessageResultPageProjectUnitActivity">MessageResultPageProjectUnitActivity</h2>

<a id="schemamessageresultpageprojectunitactivity"></a>
<a id="schema_MessageResultPageProjectUnitActivity"></a>
<a id="tocSmessageresultpageprojectunitactivity"></a>
<a id="tocsmessageresultpageprojectunitactivity"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {
    "records": [
      {
        "id": 0,
        "ecode": "##default",
        "projectId": 0,
        "treasuryUnitId": 0,
        "cusAccountId": 0,
        "accountType": "##default",
        "cpAccountId": 0,
        "coinId": "##default",
        "network": "##default",
        "type": "##default",
        "amount": "##default",
        "direction": "##default",
        "orderId": "##default",
        "businessId": "##default",
        "status": "##default",
        "travelRuleStatus": "NOT_REQUIRED",
        "kytStatus": "NOT_REQUIRED",
        "createTime": "string",
        "updateTime": "string"
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "string",
        "asc": true
      }
    ],
    "optimizeCountSql": true,
    "searchCount": true,
    "optimizeJoinOfCountSql": true,
    "maxLimit": 0,
    "countId": "string"
  }
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[PageProjectUnitActivity](#schemapageprojectunitactivity)|false|none||none|

<h2 id="tocS_AllowListItem">AllowListItem</h2>

<a id="schemaallowlistitem"></a>
<a id="schema_AllowListItem"></a>
<a id="tocSallowlistitem"></a>
<a id="tocsallowlistitem"></a>

```json
{
  "network": "string",
  "address": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|network|string|true|none||network|
|address|string|true|none||address|

<h2 id="tocS_ProjectUnitTransferOutOrder">ProjectUnitTransferOutOrder</h2>

<a id="schemaprojectunittransferoutorder"></a>
<a id="schema_ProjectUnitTransferOutOrder"></a>
<a id="tocSprojectunittransferoutorder"></a>
<a id="tocsprojectunittransferoutorder"></a>

```json
{
  "ecode": "##default",
  "vaultCode": "##default",
  "projectId": 0,
  "cusAccountId": 0,
  "address": "##default",
  "coinId": "##default",
  "network": "##default",
  "businessScope": "DEDICATED_ACCOUNT",
  "travelRuleReferenceId": "##default",
  "travelRulePayload": "##default",
  "travelRuleStatus": "PENDING",
  "travelRuleCheckStatus": "NOT_REQUIRED",
  "travelRuleCheckPayload": "##default",
  "kytStatus": "NOT_REQUIRED",
  "kytRiskScore": 0,
  "kytPayload": "##default",
  "complianceProvider": "##default",
  "orderId": "##default",
  "txId": "##default",
  "fee": "##default",
  "createTime": "##default",
  "updateTime": "##default",
  "id": 0,
  "taskId": "##default",
  "inputAmount": "##default",
  "totalAmount": "##default",
  "fundFlowCode": "##default",
  "orderState": "AUDITING",
  "payToList": [
    {
      "to": "##default",
      "amount": "##default"
    }
  ],
  "note": "##default",
  "businessId": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|ecode|string|false|none||企业code|
|vaultCode|string|false|none||金库code|
|projectId|integer(int64)|false|none||项目Id|
|cusAccountId|integer(int64)|false|none||账户id|
|address|string|false|none||交易地址|
|coinId|string|false|none||币种ID|
|network|string|false|none||所在网络|
|businessScope|string|false|none||托管业务类型|
|travelRuleReferenceId|string|false|none||Travel Rule 引用ID|
|travelRulePayload|string|false|none||Travel Rule 原始数据(JSON字符串)|
|travelRuleStatus|string|false|none||Travel Rule 状态|
|travelRuleCheckStatus|string|false|none||Travel Rule 合规状态|
|travelRuleCheckPayload|string|false|none||Travel Rule 合规回执(JSON字符串)|
|kytStatus|string|false|none||KYT 合规状态|
|kytRiskScore|integer|false|none||KYT 风险评分|
|kytPayload|string|false|none||KYT 回执(JSON字符串)|
|complianceProvider|string|false|none||合规提供方|
|orderId|string|false|none||业务订单ID|
|txId|string|false|none||链上ID,一般情况下为一条记录，有时候会出现多条记录|
|fee|string|false|none||付款手续费|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||创建时间|
|id|integer(int64)|false|none||id|
|taskId|string|false|none||审批任务ID|
|inputAmount|string|false|none||可读金额|
|totalAmount|integer|false|none||付款链上金额|
|fundFlowCode|string|false|none||资金流水号|
|orderState|string|false|none||订单状态：初始化，审批中，已拒绝，交易中，交易成功，交易失败|
|payToList|[[PayTo](#schemapayto)]|false|none||none|
|note|string|false|none||付款备注|
|businessId|string|false|none||第三方业务订单ID|

#### Enum

|Name|Value|
|---|---|
|businessScope|DEDICATED_ACCOUNT|
|businessScope|OMNIBUS_ACCOUNT|
|businessScope|OPEN_API_PROXY|
|travelRuleStatus|PENDING|
|travelRuleStatus|SUBMITTED|
|travelRuleStatus|CONFIRMED|
|travelRuleStatus|FAILED|
|travelRuleCheckStatus|NOT_REQUIRED|
|travelRuleCheckStatus|PENDING|
|travelRuleCheckStatus|PASSED|
|travelRuleCheckStatus|FAILED|
|travelRuleCheckStatus|REVIEW|
|kytStatus|NOT_REQUIRED|
|kytStatus|PENDING|
|kytStatus|PASSED|
|kytStatus|FAILED|
|kytStatus|REVIEW|
|orderState|AUDITING|
|orderState|SIGNING|
|orderState|SIGN_FAILED|
|orderState|SIGNING_REJECTED|
|orderState|TRANSITING|
|orderState|SUCCEED|
|orderState|FAILED|
|orderState|SUBMIT_FAILED|
|orderState|CONFIRMING|

<h2 id="tocS_PageProjectUnitTransferOutOrder">PageProjectUnitTransferOutOrder</h2>

<a id="schemapageprojectunittransferoutorder"></a>
<a id="schema_PageProjectUnitTransferOutOrder"></a>
<a id="tocSpageprojectunittransferoutorder"></a>
<a id="tocspageprojectunittransferoutorder"></a>

```json
{
  "records": [
    {
      "ecode": "##default",
      "vaultCode": "##default",
      "projectId": 0,
      "cusAccountId": 0,
      "address": "##default",
      "coinId": "##default",
      "network": "##default",
      "businessScope": "DEDICATED_ACCOUNT",
      "travelRuleReferenceId": "##default",
      "travelRulePayload": "##default",
      "travelRuleStatus": "PENDING",
      "travelRuleCheckStatus": "NOT_REQUIRED",
      "travelRuleCheckPayload": "##default",
      "kytStatus": "NOT_REQUIRED",
      "kytRiskScore": 0,
      "kytPayload": "##default",
      "complianceProvider": "##default",
      "orderId": "##default",
      "txId": "##default",
      "fee": "##default",
      "createTime": "##default",
      "updateTime": "##default",
      "id": 0,
      "taskId": "##default",
      "inputAmount": "##default",
      "totalAmount": "##default",
      "fundFlowCode": "##default",
      "orderState": "AUDITING",
      "payToList": [
        {
          "to": "##default",
          "amount": "##default"
        }
      ],
      "note": "##default",
      "businessId": "##default"
    }
  ],
  "total": 0,
  "size": 0,
  "current": 0,
  "orders": [
    {
      "column": "string",
      "asc": true
    }
  ],
  "optimizeCountSql": true,
  "searchCount": true,
  "optimizeJoinOfCountSql": true,
  "maxLimit": 0,
  "countId": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|records|[[ProjectUnitTransferOutOrder](#schemaprojectunittransferoutorder)]|false|none||none|
|total|integer(int64)|false|none||none|
|size|integer(int64)|false|none||none|
|current|integer(int64)|false|none||none|
|orders|[[OrderItem](#schemaorderitem)]|false|none||none|
|optimizeCountSql|boolean|false|none||none|
|searchCount|boolean|false|none||none|
|optimizeJoinOfCountSql|boolean|false|none||none|
|maxLimit|integer(int64)|false|none||none|
|countId|string|false|none||none|

<h2 id="tocS_MessageResultPageProjectUnitTransferOutOrder">MessageResultPageProjectUnitTransferOutOrder</h2>

<a id="schemamessageresultpageprojectunittransferoutorder"></a>
<a id="schema_MessageResultPageProjectUnitTransferOutOrder"></a>
<a id="tocSmessageresultpageprojectunittransferoutorder"></a>
<a id="tocsmessageresultpageprojectunittransferoutorder"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {
    "records": [
      {
        "ecode": "##default",
        "vaultCode": "##default",
        "projectId": 0,
        "cusAccountId": 0,
        "address": "##default",
        "coinId": "##default",
        "network": "##default",
        "businessScope": "DEDICATED_ACCOUNT",
        "travelRuleReferenceId": "##default",
        "travelRulePayload": "##default",
        "travelRuleStatus": "PENDING",
        "travelRuleCheckStatus": "NOT_REQUIRED",
        "travelRuleCheckPayload": "##default",
        "kytStatus": "NOT_REQUIRED",
        "kytRiskScore": 0,
        "kytPayload": "##default",
        "complianceProvider": "##default",
        "orderId": "##default",
        "txId": "##default",
        "fee": "##default",
        "createTime": "##default",
        "updateTime": "##default",
        "id": 0,
        "taskId": "##default",
        "inputAmount": "##default",
        "totalAmount": "##default",
        "fundFlowCode": "##default",
        "orderState": "AUDITING",
        "payToList": [
          {
            "to": null,
            "amount": null
          }
        ],
        "note": "##default",
        "businessId": "##default"
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "string",
        "asc": true
      }
    ],
    "optimizeCountSql": true,
    "searchCount": true,
    "optimizeJoinOfCountSql": true,
    "maxLimit": 0,
    "countId": "string"
  }
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[PageProjectUnitTransferOutOrder](#schemapageprojectunittransferoutorder)|false|none||none|

<h2 id="tocS_QueryParamProjectUnitTransferOutOrder">QueryParamProjectUnitTransferOutOrder</h2>

<a id="schemaqueryparamprojectunittransferoutorder"></a>
<a id="schema_QueryParamProjectUnitTransferOutOrder"></a>
<a id="tocSqueryparamprojectunittransferoutorder"></a>
<a id="tocsqueryparamprojectunittransferoutorder"></a>

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|pageIndex|integer|false|none||页码|
|pageSize|integer|false|none||每页数量|
|sortFields|string|false|none||排序字段，格式为:colume_d(倒叙)/colume_a(正序)|
|queryList|[[QueryCondition](#schemaquerycondition)]|false|none||查询条件|

<h2 id="tocS_ProjectUnitTransferInOrder">ProjectUnitTransferInOrder</h2>

<a id="schemaprojectunittransferinorder"></a>
<a id="schema_ProjectUnitTransferInOrder"></a>
<a id="tocSprojectunittransferinorder"></a>
<a id="tocsprojectunittransferinorder"></a>

```json
{
  "ecode": "##default",
  "vaultCode": "##default",
  "projectId": 0,
  "cusAccountId": 0,
  "address": "##default",
  "coinId": "##default",
  "network": "##default",
  "businessScope": "DEDICATED_ACCOUNT",
  "travelRuleReferenceId": "##default",
  "travelRulePayload": "##default",
  "travelRuleStatus": "PENDING",
  "travelRuleCheckStatus": "NOT_REQUIRED",
  "travelRuleCheckPayload": "##default",
  "kytStatus": "NOT_REQUIRED",
  "kytRiskScore": 0,
  "kytPayload": "##default",
  "complianceProvider": "##default",
  "orderId": "##default",
  "txId": "##default",
  "fee": "##default",
  "createTime": "##default",
  "updateTime": "##default",
  "id": 0,
  "cpAddress": "##default",
  "amount": "##default",
  "orderState": "PROCESSING",
  "type": 0,
  "note": "##default",
  "initiator": 0
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|ecode|string|false|none||企业code|
|vaultCode|string|false|none||金库code|
|projectId|integer(int64)|false|none||项目Id|
|cusAccountId|integer(int64)|false|none||账户id|
|address|string|false|none||交易地址|
|coinId|string|false|none||币种ID|
|network|string|false|none||所在网络|
|businessScope|string|false|none||托管业务类型|
|travelRuleReferenceId|string|false|none||Travel Rule 引用ID|
|travelRulePayload|string|false|none||Travel Rule 原始数据(JSON字符串)|
|travelRuleStatus|string|false|none||Travel Rule 状态|
|travelRuleCheckStatus|string|false|none||Travel Rule 合规状态|
|travelRuleCheckPayload|string|false|none||Travel Rule 合规回执(JSON字符串)|
|kytStatus|string|false|none||KYT 合规状态|
|kytRiskScore|integer|false|none||KYT 风险评分|
|kytPayload|string|false|none||KYT 回执(JSON字符串)|
|complianceProvider|string|false|none||合规提供方|
|orderId|string|false|none||业务订单ID|
|txId|string|false|none||链上ID,一般情况下为一条记录，有时候会出现多条记录|
|fee|string|false|none||付款手续费|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||创建时间|
|id|integer(int64)|false|none||id|
|cpAddress|string|false|none||付款地址|
|amount|integer|false|none||收款金额|
|orderState|string|false|none||订单状态：交易中，交易成功，交易失败|
|type|integer|false|none||订单类型：1.充值，2.收款|
|note|string|false|none||收款备注|
|initiator|integer|false|none||发起方:1.商户,2.商户的用户|

#### Enum

|Name|Value|
|---|---|
|businessScope|DEDICATED_ACCOUNT|
|businessScope|OMNIBUS_ACCOUNT|
|businessScope|OPEN_API_PROXY|
|travelRuleStatus|PENDING|
|travelRuleStatus|SUBMITTED|
|travelRuleStatus|CONFIRMED|
|travelRuleStatus|FAILED|
|travelRuleCheckStatus|NOT_REQUIRED|
|travelRuleCheckStatus|PENDING|
|travelRuleCheckStatus|PASSED|
|travelRuleCheckStatus|FAILED|
|travelRuleCheckStatus|REVIEW|
|kytStatus|NOT_REQUIRED|
|kytStatus|PENDING|
|kytStatus|PASSED|
|kytStatus|FAILED|
|kytStatus|REVIEW|
|orderState|PROCESSING|
|orderState|CONFIRMING|
|orderState|SUCCEED|
|orderState|FAILED|
|orderState|MISMATCH|
|orderState|EXPIRED|

<h2 id="tocS_PageProjectUnitTransferInOrder">PageProjectUnitTransferInOrder</h2>

<a id="schemapageprojectunittransferinorder"></a>
<a id="schema_PageProjectUnitTransferInOrder"></a>
<a id="tocSpageprojectunittransferinorder"></a>
<a id="tocspageprojectunittransferinorder"></a>

```json
{
  "records": [
    {
      "ecode": "##default",
      "vaultCode": "##default",
      "projectId": 0,
      "cusAccountId": 0,
      "address": "##default",
      "coinId": "##default",
      "network": "##default",
      "businessScope": "DEDICATED_ACCOUNT",
      "travelRuleReferenceId": "##default",
      "travelRulePayload": "##default",
      "travelRuleStatus": "PENDING",
      "travelRuleCheckStatus": "NOT_REQUIRED",
      "travelRuleCheckPayload": "##default",
      "kytStatus": "NOT_REQUIRED",
      "kytRiskScore": 0,
      "kytPayload": "##default",
      "complianceProvider": "##default",
      "orderId": "##default",
      "txId": "##default",
      "fee": "##default",
      "createTime": "##default",
      "updateTime": "##default",
      "id": 0,
      "cpAddress": "##default",
      "amount": "##default",
      "orderState": "PROCESSING",
      "type": 0,
      "note": "##default",
      "initiator": 0
    }
  ],
  "total": 0,
  "size": 0,
  "current": 0,
  "orders": [
    {
      "column": "string",
      "asc": true
    }
  ],
  "optimizeCountSql": true,
  "searchCount": true,
  "optimizeJoinOfCountSql": true,
  "maxLimit": 0,
  "countId": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|records|[[ProjectUnitTransferInOrder](#schemaprojectunittransferinorder)]|false|none||none|
|total|integer(int64)|false|none||none|
|size|integer(int64)|false|none||none|
|current|integer(int64)|false|none||none|
|orders|[[OrderItem](#schemaorderitem)]|false|none||none|
|optimizeCountSql|boolean|false|none||none|
|searchCount|boolean|false|none||none|
|optimizeJoinOfCountSql|boolean|false|none||none|
|maxLimit|integer(int64)|false|none||none|
|countId|string|false|none||none|

<h2 id="tocS_MessageResultPageProjectUnitTransferInOrder">MessageResultPageProjectUnitTransferInOrder</h2>

<a id="schemamessageresultpageprojectunittransferinorder"></a>
<a id="schema_MessageResultPageProjectUnitTransferInOrder"></a>
<a id="tocSmessageresultpageprojectunittransferinorder"></a>
<a id="tocsmessageresultpageprojectunittransferinorder"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {
    "records": [
      {
        "ecode": "##default",
        "vaultCode": "##default",
        "projectId": 0,
        "cusAccountId": 0,
        "address": "##default",
        "coinId": "##default",
        "network": "##default",
        "businessScope": "DEDICATED_ACCOUNT",
        "travelRuleReferenceId": "##default",
        "travelRulePayload": "##default",
        "travelRuleStatus": "PENDING",
        "travelRuleCheckStatus": "NOT_REQUIRED",
        "travelRuleCheckPayload": "##default",
        "kytStatus": "NOT_REQUIRED",
        "kytRiskScore": 0,
        "kytPayload": "##default",
        "complianceProvider": "##default",
        "orderId": "##default",
        "txId": "##default",
        "fee": "##default",
        "createTime": "##default",
        "updateTime": "##default",
        "id": 0,
        "cpAddress": "##default",
        "amount": "##default",
        "orderState": "PROCESSING",
        "type": 0,
        "note": "##default",
        "initiator": 0
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "string",
        "asc": true
      }
    ],
    "optimizeCountSql": true,
    "searchCount": true,
    "optimizeJoinOfCountSql": true,
    "maxLimit": 0,
    "countId": "string"
  }
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[PageProjectUnitTransferInOrder](#schemapageprojectunittransferinorder)|false|none||none|

<h2 id="tocS_QueryParamProjectUnitTransferInOrder">QueryParamProjectUnitTransferInOrder</h2>

<a id="schemaqueryparamprojectunittransferinorder"></a>
<a id="schema_QueryParamProjectUnitTransferInOrder"></a>
<a id="tocSqueryparamprojectunittransferinorder"></a>
<a id="tocsqueryparamprojectunittransferinorder"></a>

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|pageIndex|integer|false|none||页码|
|pageSize|integer|false|none||每页数量|
|sortFields|string|false|none||排序字段，格式为:colume_d(倒叙)/colume_a(正序)|
|queryList|[[QueryCondition](#schemaquerycondition)]|false|none||查询条件|

<h2 id="tocS_ProjectUnitFundRecord">ProjectUnitFundRecord</h2>

<a id="schemaprojectunitfundrecord"></a>
<a id="schema_ProjectUnitFundRecord"></a>
<a id="tocSprojectunitfundrecord"></a>
<a id="tocsprojectunitfundrecord"></a>

```json
{
  "id": 0,
  "ecode": "##default",
  "projectId": 0,
  "treasuryUnitId": 0,
  "cusAccountId": 0,
  "txId": "##default",
  "coinId": "##default",
  "network": "##default",
  "amount": "##default",
  "preBalance": "##default",
  "postBalance": "##default",
  "fee": "##default",
  "txType": "TRANSFER_IN",
  "createTime": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||主键id|
|ecode|string|false|none||商户编码|
|projectId|integer(int64)|false|none||账户组code|
|treasuryUnitId|integer(int64)|false|none||所属财务单元id|
|cusAccountId|integer(int64)|false|none||对应账户id|
|txId|string|false|none||交易ID|
|coinId|string|false|none||币种|
|network|string|false|none||网络|
|amount|integer|false|none||金额|
|preBalance|integer|false|none||期初余额|
|postBalance|integer|false|none||期末余额|
|fee|string|false|none||手续费|
|txType|string|false|none||流水类型|
|createTime|string|false|none||创建时间|

#### Enum

|Name|Value|
|---|---|
|txType|TRANSFER_IN|
|txType|TRANSFER_OUT|
|txType|ALLOCATE_IN|
|txType|ALLOCATE_OUT|
|txType|POOL_IN|
|txType|POOL_OUT|
|txType|GAS_OUT|
|txType|FEE_OUT|

<h2 id="tocS_PageProjectUnitFundRecord">PageProjectUnitFundRecord</h2>

<a id="schemapageprojectunitfundrecord"></a>
<a id="schema_PageProjectUnitFundRecord"></a>
<a id="tocSpageprojectunitfundrecord"></a>
<a id="tocspageprojectunitfundrecord"></a>

```json
{
  "records": [
    {
      "id": 0,
      "ecode": "##default",
      "projectId": 0,
      "treasuryUnitId": 0,
      "cusAccountId": 0,
      "txId": "##default",
      "coinId": "##default",
      "network": "##default",
      "amount": "##default",
      "preBalance": "##default",
      "postBalance": "##default",
      "fee": "##default",
      "txType": "TRANSFER_IN",
      "createTime": "##default"
    }
  ],
  "total": 0,
  "size": 0,
  "current": 0,
  "orders": [
    {
      "column": "string",
      "asc": true
    }
  ],
  "optimizeCountSql": true,
  "searchCount": true,
  "optimizeJoinOfCountSql": true,
  "maxLimit": 0,
  "countId": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|records|[[ProjectUnitFundRecord](#schemaprojectunitfundrecord)]|false|none||none|
|total|integer(int64)|false|none||none|
|size|integer(int64)|false|none||none|
|current|integer(int64)|false|none||none|
|orders|[[OrderItem](#schemaorderitem)]|false|none||none|
|optimizeCountSql|boolean|false|none||none|
|searchCount|boolean|false|none||none|
|optimizeJoinOfCountSql|boolean|false|none||none|
|maxLimit|integer(int64)|false|none||none|
|countId|string|false|none||none|

<h2 id="tocS_MessageResultPageProjectUnitFundRecord">MessageResultPageProjectUnitFundRecord</h2>

<a id="schemamessageresultpageprojectunitfundrecord"></a>
<a id="schema_MessageResultPageProjectUnitFundRecord"></a>
<a id="tocSmessageresultpageprojectunitfundrecord"></a>
<a id="tocsmessageresultpageprojectunitfundrecord"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {
    "records": [
      {
        "id": 0,
        "ecode": "##default",
        "projectId": 0,
        "treasuryUnitId": 0,
        "cusAccountId": 0,
        "txId": "##default",
        "coinId": "##default",
        "network": "##default",
        "amount": "##default",
        "preBalance": "##default",
        "postBalance": "##default",
        "fee": "##default",
        "txType": "TRANSFER_IN",
        "createTime": "##default"
      }
    ],
    "total": 0,
    "size": 0,
    "current": 0,
    "orders": [
      {
        "column": "string",
        "asc": true
      }
    ],
    "optimizeCountSql": true,
    "searchCount": true,
    "optimizeJoinOfCountSql": true,
    "maxLimit": 0,
    "countId": "string"
  }
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[PageProjectUnitFundRecord](#schemapageprojectunitfundrecord)|false|none||none|

<h2 id="tocS_QueryCondition">QueryCondition</h2>

<a id="schemaquerycondition"></a>
<a id="schema_QueryCondition"></a>
<a id="tocSquerycondition"></a>
<a id="tocsquerycondition"></a>

```json
{
  "key": "string",
  "value": {},
  "oper": "string",
  "join": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|key|string|false|none||操作符的key，如查询时的name,id之类|
|value|object|false|none||操作符的value，具体要查询的值，如果是字符串改成字符串即可|
|oper|string|false|none||操作符,默认是等于，冒号表示模糊匹配|
|join|string|false|none||连接的方式：and或者or|

<h2 id="tocS_QueryParamProjectUnitActivity">QueryParamProjectUnitActivity</h2>

<a id="schemaqueryparamprojectunitactivity"></a>
<a id="schema_QueryParamProjectUnitActivity"></a>
<a id="tocSqueryparamprojectunitactivity"></a>
<a id="tocsqueryparamprojectunitactivity"></a>

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|pageIndex|integer|false|none||页码|
|pageSize|integer|false|none||每页数量|
|sortFields|string|false|none||排序字段，格式为:colume_d(倒叙)/colume_a(正序)|
|queryList|[[QueryCondition](#schemaquerycondition)]|false|none||查询条件|

<h2 id="tocS_QueryParamProjectUnitFundRecord">QueryParamProjectUnitFundRecord</h2>

<a id="schemaqueryparamprojectunitfundrecord"></a>
<a id="schema_QueryParamProjectUnitFundRecord"></a>
<a id="tocSqueryparamprojectunitfundrecord"></a>
<a id="tocsqueryparamprojectunitfundrecord"></a>

```json
{
  "pageIndex": 0,
  "pageSize": 0,
  "sortFields": "string",
  "queryList": [
    {
      "key": "string",
      "value": {},
      "oper": "string",
      "join": "string"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|pageIndex|integer|false|none||页码|
|pageSize|integer|false|none||每页数量|
|sortFields|string|false|none||排序字段，格式为:colume_d(倒叙)/colume_a(正序)|
|queryList|[[QueryCondition](#schemaquerycondition)]|false|none||查询条件|

<h2 id="tocS_PayTo">PayTo</h2>

<a id="schemapayto"></a>
<a id="schema_PayTo"></a>
<a id="tocSpayto"></a>
<a id="tocspayto"></a>

```json
{
  "to": "##default",
  "amount": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|to|string|false|none||转出地址|
|amount|integer|false|none||付款金额|

<h2 id="tocS_TravelRuleRequest">TravelRuleRequest</h2>

<a id="schematravelrulerequest"></a>
<a id="schema_TravelRuleRequest"></a>
<a id="tocStravelrulerequest"></a>
<a id="tocstravelrulerequest"></a>

```json
{
  "referenceId": "##default",
  "payload": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|referenceId|string|true|none||Travel Rule 引用ID|
|payload|string|false|none||Travel Rule 原始数据(JSON字符串)|

<h2 id="tocS_MerchantProject">MerchantProject</h2>

<a id="schemamerchantproject"></a>
<a id="schema_MerchantProject"></a>
<a id="tocSmerchantproject"></a>
<a id="tocsmerchantproject"></a>

```json
{
  "id": 0,
  "name": "##default",
  "ecode": "##default",
  "vaultCode": "##default",
  "groupCode": "##default",
  "networks": "##default",
  "status": "##default",
  "gmaId": "string",
  "caaFactoryAddresses": [
    {
      "network": "string",
      "address": "string"
    }
  ],
  "factoryStatus": 1,
  "sort": 0,
  "remark": "string",
  "createTime": "##default",
  "updateTime": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||none|
|name|string|false|none||项目名称|
|ecode|string|false|none||企业code|
|vaultCode|string|false|none||vault code|
|groupCode|string|false|none||账户组code|
|networks|[string]|false|none||网络|
|status|string|false|none||账户组状态:ACTIVATED/INACTIVE/ACTIVATING|
|gmaId|string|false|none||燃气管理账户ID,不创建也可以使用|
|caaFactoryAddresses|[[AllowListItem](#schemaallowlistitem)]|false|none||合约收款的工厂地址|
|factoryStatus|integer|false|none||工厂状态:1.未启用,2.启用中,3,已启用|
|sort|integer|false|none||none|
|remark|string|false|none||none|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||更新时间|

<h2 id="tocS_MessageResultMerchantProject">MessageResultMerchantProject</h2>

<a id="schemamessageresultmerchantproject"></a>
<a id="schema_MessageResultMerchantProject"></a>
<a id="tocSmessageresultmerchantproject"></a>
<a id="tocsmessageresultmerchantproject"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {
    "id": 0,
    "name": "##default",
    "ecode": "##default",
    "vaultCode": "##default",
    "groupCode": "##default",
    "networks": "##default",
    "status": "##default",
    "gmaId": "string",
    "caaFactoryAddresses": [
      {
        "network": "string",
        "address": "string"
      }
    ],
    "factoryStatus": 1,
    "sort": 0,
    "remark": "string",
    "createTime": "##default",
    "updateTime": "##default"
  }
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[MerchantProject](#schemamerchantproject)|false|none||none|

<h2 id="tocS_AccountData">AccountData</h2>

<a id="schemaaccountdata"></a>
<a id="schema_AccountData"></a>
<a id="tocSaccountdata"></a>
<a id="tocsaccountdata"></a>

```json
{
  "account_name": "string",
  "account_type": "string"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|account_name|string|false|none||none|
|account_type|string|false|none||none|

<h2 id="tocS_ProjectUnit">ProjectUnit</h2>

<a id="schemaprojectunit"></a>
<a id="schema_ProjectUnit"></a>
<a id="tocSprojectunit"></a>
<a id="tocsprojectunit"></a>

```json
{
  "id": 0,
  "ecode": "##default",
  "projectId": 0,
  "name": "##default",
  "ubo": "##default",
  "custodyServiceMode": "DEDICATED_ACCOUNT",
  "coinIds": "##default",
  "accounts": "##default",
  "status": "Active",
  "sort": 0,
  "creationType": "PLATFORM",
  "developerId": "##default",
  "remark": "##default",
  "createTime": "##default",
  "updateTime": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||ID|
|ecode|string|false|none||企业code|
|projectId|integer(int64)|false|none||项目ID|
|name|string|false|none||名字|
|ubo|string|false|none||最终受益人的ecode，如果是三方模式，是另外一个企业ID，否则就是自己的企业ID|
|custodyServiceMode|string|false|none||托管接入模式|
|coinIds|[[CoinDto](#schemacoindto)]|false|none||币种集合|
|accounts|[[AccountData](#schemaaccountdata)]|false|none||账户列表|
|status|string|false|none||none|
|sort|integer|false|none||排序|
|creationType|string|false|none||创建类型: PLATFORM/THIRD_PARTY|
|developerId|string|false|none||三方平台开发者ID|
|remark|string|false|none||备注|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||更新时间|

#### Enum

|Name|Value|
|---|---|
|custodyServiceMode|DEDICATED_ACCOUNT|
|custodyServiceMode|OMNIBUS_ACCOUNT|
|custodyServiceMode|OPEN_API_PROXY|
|creationType|PLATFORM|
|creationType|THIRD_PARTY|

<h2 id="tocS_MessageResultListProjectUnit">MessageResultListProjectUnit</h2>

<a id="schemamessageresultlistprojectunit"></a>
<a id="schema_MessageResultListProjectUnit"></a>
<a id="tocSmessageresultlistprojectunit"></a>
<a id="tocsmessageresultlistprojectunit"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": [
    {
      "id": 0,
      "ecode": "##default",
      "projectId": 0,
      "name": "##default",
      "ubo": "##default",
      "custodyServiceMode": "DEDICATED_ACCOUNT",
      "coinIds": "##default",
      "accounts": "##default",
      "status": "Active",
      "sort": 0,
      "creationType": "PLATFORM",
      "developerId": "##default",
      "remark": "##default",
      "createTime": "##default",
      "updateTime": "##default"
    }
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|code|integer|false|none||none|
|message|string|false|none||none|
|data|[[ProjectUnit](#schemaprojectunit)]|false|none||none|

<h2 id="tocS_ThirdAddressRequest">ThirdAddressRequest</h2>

<a id="schemathirdaddressrequest"></a>
<a id="schema_ThirdAddressRequest"></a>
<a id="tocSthirdaddressrequest"></a>
<a id="tocsthirdaddressrequest"></a>

```json
{
  "accountType": "FREEZE",
  "pageSize": 0,
  "pageNum": 0,
  "coinId": "##default",
  "network": "##default",
  "unitId": 0
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|accountType|string|false|none||账户类型|
|pageSize|integer|false|none||每页数量|
|pageNum|integer|false|none||页码|
|coinId|string|false|none||币种ID|
|network|string|false|none||网络|
|unitId|integer(int64)|false|none||财务单元ID|

#### Enum

|Name|Value|
|---|---|
|accountType|FREEZE|
|accountType|DEPOSIT|
|accountType|PRIMARY|
|accountType|RECEIVABLE|
|accountType|PAYOUT|
|accountType|PAYIN|
|accountType|GENERAL_GAS|
|accountType|QUARANTINE|
|accountType|DIRTY|

<h2 id="tocS_ThirdPayoutRequest">ThirdPayoutRequest</h2>

<a id="schemathirdpayoutrequest"></a>
<a id="schema_ThirdPayoutRequest"></a>
<a id="tocSthirdpayoutrequest"></a>
<a id="tocsthirdpayoutrequest"></a>

```json
{
  "payTo": "##default",
  "from": "##default",
  "unitId": 0,
  "coinId": "##default",
  "network": "##default",
  "operation": "##default",
  "username": "##default",
  "userId": "##default",
  "orderId": "##default",
  "note": "##default",
  "lang": "##default",
  "merchantType": "NON_FINANCIAL_CORPORATE",
  "travelRule": "##default"
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|payTo|[[PayTo](#schemapayto)]|false|none||出金地址及信息列表|
|from|string|false|none||出金地址|
|unitId|integer(int64)|false|none||出金财务单元ID|
|coinId|string|false|none||币种ID|
|network|string|false|none||网络|
|operation|string|false|none||操作类型:withdraw/allocate/payout|
|username|string|false|none||发起用户名|
|userId|string|false|none||发起用户ID|
|orderId|string|false|none||客户业务订单ID|
|note|string|false|none||备注|
|lang|string|false|none||语言|
|merchantType|string|true|none||业务类型|
|travelRule|[TravelRuleRequest](#schematravelrulerequest)|true|none||Travel Rule信息|

#### Enum

|Name|Value|
|---|---|
|merchantType|NON_FINANCIAL_CORPORATE|
|merchantType|REGULATED_VASP|
|merchantType|INTERNAL_SYSTEM|

<h2 id="tocS_MapListString">MapListString</h2>

<a id="schemamapliststring"></a>
<a id="schema_MapListString"></a>
<a id="tocSmapliststring"></a>
<a id="tocsmapliststring"></a>

```json
{
  "key": [
    "string"
  ]
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|key|[string]|false|none||none|

<h2 id="tocS_SubmitTaskDTO">SubmitTaskDTO</h2>

<a id="schemasubmittaskdto"></a>
<a id="schema_SubmitTaskDTO"></a>
<a id="tocSsubmittaskdto"></a>
<a id="tocssubmittaskdto"></a>

```json
{
  "signatures": "##default",
  "confirmed": false
}

```

### Attribute

|Name|Type|Required|Restrictions|Title|Description|
|---|---|---|---|---|---|
|signatures|[MapListString](#schemamapliststring)|false|none||签名结果：key为taskId，value为签名字符串列表|
|confirmed|boolean|false|none||状态:同意/拒绝|

