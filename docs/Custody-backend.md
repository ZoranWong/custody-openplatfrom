# Custody-backend API Reference

> Auto-generated from Apifox: https://s.apifox.cn/f3031687-1674-45bb-b4fd-13d3bf8cf910/llms.txt

> Last updated: 2026-06-02

> Total endpoints: 13


Base URLs:

- **测试环境:** `http://api.vaulink.com/custody-backend`

---

## API Endpoints


1. [Create a new treasure unit](#create-a-new-treasure-unit) — `POST /api/third-party/create/{resourceAccessKey}`

2. [Create treasure unit address](#create-treasure-unit-address) — `POST /api/third-party/create-unit-address/{resourceAccessKey}/{unitId}/{accountTypy}/{network}/{coinId}/{number}`

3. [List treasure units](#list-treasure-units) — `POST /api/third-party/list/{resourceAccessKey}`

4. [listUnitAccount](#listunitaccount) — `POST /api/third-party/list-unit-account/{resourceAccessKey}/{unitId}`

5. [Get treasure unit address](#get-treasure-unit-address) — `POST /api/third-party/get-unit-address/{resourceAccessKey}`

6. [Pooling request](#pooling-request) — `POST /api/third-party/pooling/{resourceAccessKey}`

7. [发起付款](#发起付款) — `POST /api/third-party/payout/{resourceAccessKey}`

8. [任务提交接口,针对三方平台使用](#任务提交接口,针对三方平台使用) — `POST /api/third-party/submit/task/{resourceAccessKey}/{taskId}`

9. [Query activities with pagination](#query-activities-with-pagination) — `POST /api/third-party/activities/{resourceAccessKey}`

10. [Query transfer-out orders with pagination](#query-transfer-out-orders-with-pagination) — `POST /api/third-party/transfer-out-orders/{resourceAccessKey}`

11. [Query transfer-in orders with pagination](#query-transfer-in-orders-with-pagination) — `POST /api/third-party/transfer-in-orders/{resourceAccessKey}`

12. [账户级流水](#账户级流水) — `POST /api/third-party/fund-records/{resourceAccessKey}`

13. [财务单元级流水](#财务单元级流水) — `POST /api/third-party/unit-fund-records/{resourceAccessKey}`


---

## 1. Create a new treasure unit

`POST /api/third-party/create/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/create/{resourceAccessKey}:
    post:
      summary: Create a new treasure unit
      deprecated: false
      description: >-
        Create a new treasure unit

        Creates a new financial unit under the merchant associated with the API
        Key.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectTreasuryUnitSmartRequest'
              description: ''
            examples: {}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultProjectUnit'
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      custodialBusinessScope: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
                '5':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
                '6':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      id: 0
                      name: ''
                      ecode: ''
                      vaultCode: ''
                      groupCode: ''
                      networks:
                        - ''
                      status: ''
                      gmaId: ''
                      caaFactoryAddresses:
                        - network: ''
                          address: ''
                      factoryStatus: 0
                      sort: 0
                      remark: ''
                      createTime: ''
                      updateTime: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-428012995-run
components:
  schemas:
    CreateProjectTreasuryUnitSmartRequest:
      type: object
      properties:
        unitName:
          type: string
          description: 财务单元名称
          default: '##default'
        businessScope:
          type: string
          description: 业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        businessPurpose:
          type: string
          description: 业务用途
          default: '##default'
        topology:
          type: string
          description: 账本拓扑结构模型（决定底层建立几个账户）
          enum:
            - ORBIT
            - SINGLE_GENERAL
            - QUAD_SMART_ISOLATION
          x-apifox-enum:
            - value: ORBIT
              name: ORBIT
              description: orbit财务单元
            - value: SINGLE_GENERAL
              name: SINGLE_GENERAL
              description: |-
                单一普通账户模型 (Single General Account)
                适用于：系统Gas池、简单的大额对公财资划转、历史 ORBIT 模式。
                行为：只建 1 个 PRIMARY 账户，类型为 GENERAL。不需要部署合约工厂。
            - value: QUAD_SMART_ISOLATION
              name: QUAD_SMART_ISOLATION
              description: >-
                四账户智能隔离模型 (Quad Smart Accounts)

                适用于：高并发的代收代付(Payment)、专户全托管模式。

                行为：建立 PAYIN, PRIMARY, PAYOUT, QUARANTINE 4个账户，类型为
                SMART，并自动配置资金归集路由与白名单。
          default: '##default'
        coinIds:
          type: array
          items: &ref_2
            $ref: '#/components/schemas/CoinDto'
            description: com.cregis.custody.common.dto.trustVault.CoinDto
          description: 币种信息
          default: '##default'
        autoSignUrl:
          type: string
          description: 自动签入地址
          default: '##default'
        primaryManager:
          type: array
          items: &ref_0
            $ref: '#/components/schemas/FundControl'
            description: com.spark.support.wccip.dto.FundControl
          description: 资金管理员
          default: '##default'
        primaryWhiteList:
          type: array
          items:
            $ref: '#/components/schemas/WhiteListCreateRequest'
            description: com.cregis.custody.common.dto.WhiteListCreateRequest
          description: 资金白名单
          default: '##default'
        primaryAnycallRules:
          type: array
          items: &ref_1
            $ref: '#/components/schemas/AnyCallRule'
            description: com.spark.support.wccip.dto.AnyCallRule
          description: 通用调用控制信息
          default: '##default'
        thirdPartyEcode:
          type: string
          description: 三方平台ecode，用于标识三方平台身份
          default: '##default'
        remark:
          type: string
          description: 备注信息
          default: '##default'
        payoutManager:
          type: array
          items: *ref_0
          description: 出金管理员
          default: '##default'
        payinAnycallRules:
          type: array
          items: *ref_1
          description: 收款账户通用调用控制信息
          default: '##default'
        payoutAnycallRules:
          type: array
          items: *ref_1
          description: 付款通用调用控制信息
          default: '##default'
        riskAnycallRules:
          type: array
          items: *ref_1
          description: 风控账户出金通用调用控制信息
          default: '##default'
      x-apifox-orders:
        - unitName
        - businessScope
        - businessPurpose
        - topology
        - coinIds
        - autoSignUrl
        - primaryManager
        - primaryWhiteList
        - primaryAnycallRules
        - thirdPartyEcode
        - remark
        - payoutManager
        - payinAnycallRules
        - payoutAnycallRules
        - riskAnycallRules
      required:
        - unitName
        - businessScope
        - topology
        - coinIds
        - primaryManager
        - payoutManager
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    AnyCallRule:
      type: object
      properties:
        guardians:
          type: array
          items:
            type: string
          description: 护卫队成员
        threshold:
          type: string
          description: 护卫队的操作门限
        allowedCommands:
          type: array
          items:
            type: string
          description: 允许执行的指令列表
        allowed_commands:
          type: array
          items:
            type: string
          description: ''
      x-apifox-orders:
        - guardians
        - threshold
        - allowedCommands
        - allowed_commands
      required:
        - guardians
        - threshold
        - allowedCommands
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    WhiteListCreateRequest:
      type: object
      properties:
        network:
          type: string
          description: network
          default: '##default'
        address:
          type: string
          description: address
          default: '##default'
        alias:
          type: string
          description: alias
          default: '##default'
      x-apifox-orders:
        - network
        - address
        - alias
      required:
        - network
        - address
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    FundControl:
      type: object
      properties:
        coinId:
          type: string
          description: 币种名称
        fundControlRules:
          type: array
          items:
            $ref: '#/components/schemas/FundControlRule'
            description: com.spark.support.wccip.dto.FundControlRule
          description: 金额约束信息
      x-apifox-orders:
        - coinId
        - fundControlRules
      required:
        - coinId
        - fundControlRules
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    FundControlRule:
      type: object
      properties:
        guardians:
          type: array
          items:
            type: string
          description: 护卫队成员
        threshold:
          type: string
          description: 护卫队的操作门限
        perTransferLimit:
          type: string
          description: 单笔限额
        dailyTransferLimit:
          type: string
          description: 单日限额
      x-apifox-orders:
        - guardians
        - threshold
        - perTransferLimit
        - dailyTransferLimit
      required:
        - guardians
        - threshold
        - perTransferLimit
        - dailyTransferLimit
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    CoinDto:
      type: object
      properties:
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
      x-apifox-orders:
        - coinId
        - network
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultProjectUnit:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/ProjectUnit'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnit:
      type: object
      properties:
        id:
          type: integer
          description: ID
          format: int64
        ecode:
          type: string
          description: 企业code
          default: '##default'
        projectId:
          type: integer
          description: 项目ID
          format: int64
        name:
          type: string
          description: 名字
          default: '##default'
        ubo:
          type: string
          description: 最终受益人的ecode，如果是三方模式，是另外一个企业ID，否则就是自己的企业ID
          default: '##default'
        custodyServiceMode:
          type: string
          description: 托管接入模式
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        coinIds:
          type: array
          items: *ref_2
          description: 币种集合
          default: '##default'
        accounts:
          type: array
          items:
            $ref: '#/components/schemas/AccountData'
            description: com.spark.support.wccip.dto.AccountData
          description: 账户列表
          default: '##default'
        businessPurpose:
          type: string
          description: 业务用途
          default: '##default'
        status:
          type: string
          description: ''
          default: Active
        sort:
          type: integer
          description: 排序
        creationType:
          type: string
          description: '创建类型: PLATFORM/THIRD_PARTY'
          enum:
            - PLATFORM
            - THIRD_PARTY
          x-apifox-enum:
            - value: PLATFORM
              name: PLATFORM
              description: 平台直接创建
            - value: THIRD_PARTY
              name: THIRD_PARTY
              description: 三方平台创建
          default: '##default'
        developerId:
          type: string
          description: 三方平台开发者ID
          default: '##default'
        creatorId:
          type: integer
          description: 创建人
          format: int64
        remark:
          type: string
          description: 备注
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 更新时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - name
        - ubo
        - custodyServiceMode
        - coinIds
        - accounts
        - businessPurpose
        - status
        - sort
        - creationType
        - developerId
        - creatorId
        - remark
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    AccountData:
      type: object
      properties:
        account_name:
          type: string
          description: ''
        account_type:
          type: string
          description: ''
      x-apifox-orders:
        - account_name
        - account_type
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 2. Create treasure unit address

`POST /api/third-party/create-unit-address/{resourceAccessKey}/{unitId}/{accountTypy}/{network}/{coinId}/{number}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/create-unit-address/{resourceAccessKey}/{unitId}/{accountTypy}/{network}/{coinId}/{number}:
    post:
      summary: Create treasure unit address
      deprecated: false
      description: |-
        Create treasure unit address
        创建地址
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
        - name: unitId
          in: path
          description: ''
          required: true
          schema:
            type: integer
        - name: accountTypy
          in: path
          description: |-
            PRIMARY :主账户
            PAYOUT :出金账户
            PAYIN :用户付款账户，即商户收款 CA
          required: true
          schema:
            type: string
        - name: network
          in: path
          description: ''
          required: true
          schema:
            type: string
        - name: coinId
          in: path
          description: ''
          required: true
          schema:
            type: string
        - name: number
          in: path
          description: ''
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResult%3F'
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-465560086-run
components:
  schemas:
    MessageResult?:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          description: ''
          type: 'null'
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 3. List treasure units

`POST /api/third-party/list/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/list/{resourceAccessKey}:
    post:
      summary: List treasure units
      deprecated: false
      description: >-
        List treasure units

        Lists all financial units created by the developer under the authorized
        merchant.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultListProjectUnit'
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      - id: 0
                        ecode: ''
                        projectId: 0
                        name: ''
                        merchantType: ''
                        coinIds:
                          - coinId: ''
                            network: ''
                        accounts:
                          - account_name: ''
                            account_type: ''
                        status: ''
                        sort: 0
                        creationType: ''
                        developerId: ''
                        remark: ''
                        createTime: ''
                        updateTime: ''
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      - id: 0
                        ecode: ''
                        projectId: 0
                        name: ''
                        ubo: ''
                        custodyServiceMode: ''
                        coinIds:
                          - coinId: ''
                            network: ''
                        accounts:
                          - account_name: ''
                            account_type: ''
                        status: ''
                        sort: 0
                        creationType: ''
                        developerId: ''
                        remark: ''
                        createTime: ''
                        updateTime: ''
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      - id: 0
                        ecode: ''
                        projectId: 0
                        name: ''
                        ubo: ''
                        custodyServiceMode: ''
                        coinIds:
                          - coinId: ''
                            network: ''
                        accounts:
                          - account_name: ''
                            account_type: ''
                        status: ''
                        sort: 0
                        creationType: ''
                        developerId: ''
                        remark: ''
                        createTime: ''
                        updateTime: ''
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      - id: 0
                        ecode: ''
                        projectId: 0
                        name: ''
                        ubo: ''
                        custodyServiceMode: ''
                        coinIds:
                          - coinId: ''
                            network: ''
                        accounts:
                          - account_name: ''
                            account_type: ''
                        status: ''
                        sort: 0
                        creationType: ''
                        developerId: ''
                        remark: ''
                        createTime: ''
                        updateTime: ''
                '5':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      - id: 0
                        ecode: ''
                        projectId: 0
                        name: ''
                        ubo: ''
                        custodyServiceMode: ''
                        coinIds:
                          - coinId: ''
                            network: ''
                        accounts:
                          - account_name: ''
                            account_type: ''
                        status: ''
                        sort: 0
                        creationType: ''
                        developerId: ''
                        remark: ''
                        createTime: ''
                        updateTime: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-428012996-run
components:
  schemas:
    MessageResultListProjectUnit:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnit'
            description: com.cregis.custody.common.entity.project.ProjectUnit
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnit:
      type: object
      properties:
        id:
          type: integer
          description: ID
          format: int64
        ecode:
          type: string
          description: 企业code
          default: '##default'
        projectId:
          type: integer
          description: 项目ID
          format: int64
        name:
          type: string
          description: 名字
          default: '##default'
        ubo:
          type: string
          description: 最终受益人的ecode，如果是三方模式，是另外一个企业ID，否则就是自己的企业ID
          default: '##default'
        custodyServiceMode:
          type: string
          description: 托管接入模式
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        coinIds:
          type: array
          items:
            $ref: '#/components/schemas/CoinDto'
            description: com.cregis.custody.common.dto.trustVault.CoinDto
          description: 币种集合
          default: '##default'
        accounts:
          type: array
          items:
            $ref: '#/components/schemas/AccountData'
            description: com.spark.support.wccip.dto.AccountData
          description: 账户列表
          default: '##default'
        businessPurpose:
          type: string
          description: 业务用途
          default: '##default'
        status:
          type: string
          description: ''
          default: Active
        sort:
          type: integer
          description: 排序
        creationType:
          type: string
          description: '创建类型: PLATFORM/THIRD_PARTY'
          enum:
            - PLATFORM
            - THIRD_PARTY
          x-apifox-enum:
            - value: PLATFORM
              name: PLATFORM
              description: 平台直接创建
            - value: THIRD_PARTY
              name: THIRD_PARTY
              description: 三方平台创建
          default: '##default'
        developerId:
          type: string
          description: 三方平台开发者ID
          default: '##default'
        creatorId:
          type: integer
          description: 创建人
          format: int64
        remark:
          type: string
          description: 备注
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 更新时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - name
        - ubo
        - custodyServiceMode
        - coinIds
        - accounts
        - businessPurpose
        - status
        - sort
        - creationType
        - developerId
        - creatorId
        - remark
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    AccountData:
      type: object
      properties:
        account_name:
          type: string
          description: ''
        account_type:
          type: string
          description: ''
      x-apifox-orders:
        - account_name
        - account_type
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    CoinDto:
      type: object
      properties:
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
      x-apifox-orders:
        - coinId
        - network
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 4. listUnitAccount

`POST /api/third-party/list-unit-account/{resourceAccessKey}/{unitId}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/list-unit-account/{resourceAccessKey}/{unitId}:
    post:
      summary: listUnitAccount
      deprecated: false
      description: ''
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
        - name: unitId
          in: path
          description: ''
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultListProjectUnitAccount'
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-465560114-run
components:
  schemas:
    MessageResultListProjectUnitAccount:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitAccount'
            description: com.cregis.custody.common.entity.project.ProjectUnitAccount
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitAccount:
      type: object
      properties:
        id:
          type: integer
          description: id
          format: int64
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: vault code
          default: '##default'
        vaultAccountId:
          type: string
          description: 对应trustVault账户id
          default: '##default'
        projectId:
          type: integer
          description: 所属项目ID
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        accountName:
          type: string
          description: 账户名称
          default: '##default'
        fundFlowCode:
          type: string
          description: fundFlow code
          default: '##default'
        anycallCode:
          type: string
          description: anycall code
          default: '##default'
        autoSignUrl:
          type: string
          description: |-
            auto_sign_url
            自动签入地址
          default: '##default'
        balance:
          type: integer
          description: 主账户余额
          default: '##default'
        freezeBalance:
          type: integer
          description: 冻结余额
          default: '##default'
        holdBalance:
          type: integer
          description: 隔离余额（合规待确认/待复核的入金隔离资金）
          default: '##default'
        coinId:
          type: string
          description: 管理的资产类型
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        type:
          type: string
          description: 账户类型
          enum:
            - FREEZE
            - DEPOSIT
            - PRIMARY
            - RECEIVABLE
            - PAYOUT
            - PAYIN
            - GENERAL_GAS
            - QUARANTINE
            - DIRTY
          x-apifox-enum:
            - value: FREEZE
              name: FREEZE
              description: FREEZE
            - value: DEPOSIT
              name: DEPOSIT
              description: 以下是业务账户区分,不与trust Vault相关
            - value: PRIMARY
              name: PRIMARY
              description: 主账户
            - value: RECEIVABLE
              name: RECEIVABLE
              description: 入金账户 EOA
            - value: PAYOUT
              name: PAYOUT
              description: 出金账户
            - value: PAYIN
              name: PAYIN
              description: 用户付款账户，即商户收款 CA
            - value: GENERAL_GAS
              name: GENERAL_GAS
              description: GENERAL_GAS
            - value: QUARANTINE
              name: QUARANTINE
              description: 风险隔离账户，用于承接待复核/待处置的风险资金
            - value: DIRTY
              name: DIRTY
              description: 兼容历史数据与旧实现命名，请勿在新逻辑中继续使用
          default: '##default'
        status:
          type: integer
          description: 状态:0不可用,1可用
        income:
          type: integer
          description: 账户总入金
          default: '##default'
        outcome:
          type: integer
          description: 账户总出金
          default: '##default'
        isSmart:
          type: boolean
          description: 是否是智能账户
          default: false
        remark:
          type: string
          description: 备注
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - vaultCode
        - vaultAccountId
        - projectId
        - treasuryUnitId
        - accountName
        - fundFlowCode
        - anycallCode
        - autoSignUrl
        - balance
        - freezeBalance
        - holdBalance
        - coinId
        - network
        - type
        - status
        - income
        - outcome
        - isSmart
        - remark
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 5. Get treasure unit address

`POST /api/third-party/get-unit-address/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/get-unit-address/{resourceAccessKey}:
    post:
      summary: Get treasure unit address
      deprecated: false
      description: Get treasure unit address
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ThirdAddressRequest'
              description: ''
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResult%3F'
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '5':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-428012997-run
components:
  schemas:
    ThirdAddressRequest:
      type: object
      properties:
        accountType:
          type: string
          description: 账户类型
          enum:
            - FREEZE
            - DEPOSIT
            - PRIMARY
            - RECEIVABLE
            - PAYOUT
            - PAYIN
            - GENERAL_GAS
            - QUARANTINE
            - DIRTY
          x-apifox-enum:
            - value: FREEZE
              name: FREEZE
              description: FREEZE
            - value: DEPOSIT
              name: DEPOSIT
              description: 以下是业务账户区分,不与trust Vault相关
            - value: PRIMARY
              name: PRIMARY
              description: 主账户
            - value: RECEIVABLE
              name: RECEIVABLE
              description: 入金账户 EOA
            - value: PAYOUT
              name: PAYOUT
              description: 出金账户
            - value: PAYIN
              name: PAYIN
              description: PAYIN
            - value: GENERAL_GAS
              name: GENERAL_GAS
              description: GENERAL_GAS
            - value: QUARANTINE
              name: QUARANTINE
              description: 风险隔离账户，用于承接待复核/待处置的风险资金
            - value: DIRTY
              name: DIRTY
              description: 兼容历史数据与旧实现命名，请勿在新逻辑中继续使用
          default: '##default'
        pageSize:
          type: integer
          description: 每页数量
        pageNum:
          type: integer
          description: 页码
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        unitId:
          type: integer
          description: 财务单元ID
          format: int64
      x-apifox-orders:
        - accountType
        - pageSize
        - pageNum
        - coinId
        - network
        - unitId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResult?:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          description: ''
          type: 'null'
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 6. Pooling request

`POST /api/third-party/pooling/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/pooling/{resourceAccessKey}:
    post:
      summary: Pooling request
      deprecated: false
      description: |-
        发起归集请求
        Pooling request
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ThirdPoolingRequest'
              description: 请求参数
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResult%3F'
                description: 响应结果
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-463061859-run
components:
  schemas:
    ThirdPoolingRequest:
      type: object
      properties:
        unitId:
          type: integer
          description: 财务单元ID
          format: int64
        amount:
          type: integer
          description: 归集门限金额
          default: '##default'
        lang:
          type: string
          description: 语言
          enum:
            - zh_CN
            - zh_TW
            - en_US
            - en_GB
            - ja_JP
            - ko_KR
            - fr_FR
            - de_DE
            - es_ES
            - it_IT
            - ru_RU
            - pt_PT
            - pt_BR
            - vi_VN
            - th_TH
            - id_ID
            - tr_TR
            - ar_SA
            - he_IL
            - nl_NL
            - pl_PL
            - sv_SE
            - fi_FI
            - da_DK
            - no_NO
            - cs_CZ
            - hu_HU
            - ro_RO
            - el_GR
            - ms_MY
            - uk_UA
          x-apifox-enum:
            - value: zh_CN
              name: zh_CN
              description: zh_CN
            - value: zh_TW
              name: zh_TW
              description: zh_TW
            - value: en_US
              name: en_US
              description: en_US
            - value: en_GB
              name: en_GB
              description: en_GB
            - value: ja_JP
              name: ja_JP
              description: ja_JP
            - value: ko_KR
              name: ko_KR
              description: ko_KR
            - value: fr_FR
              name: fr_FR
              description: fr_FR
            - value: de_DE
              name: de_DE
              description: de_DE
            - value: es_ES
              name: es_ES
              description: es_ES
            - value: it_IT
              name: it_IT
              description: it_IT
            - value: ru_RU
              name: ru_RU
              description: ru_RU
            - value: pt_PT
              name: pt_PT
              description: pt_PT
            - value: pt_BR
              name: pt_BR
              description: pt_BR
            - value: vi_VN
              name: vi_VN
              description: vi_VN
            - value: th_TH
              name: th_TH
              description: th_TH
            - value: id_ID
              name: id_ID
              description: id_ID
            - value: tr_TR
              name: tr_TR
              description: tr_TR
            - value: ar_SA
              name: ar_SA
              description: ar_SA
            - value: he_IL
              name: he_IL
              description: he_IL
            - value: nl_NL
              name: nl_NL
              description: nl_NL
            - value: pl_PL
              name: pl_PL
              description: pl_PL
            - value: sv_SE
              name: sv_SE
              description: sv_SE
            - value: fi_FI
              name: fi_FI
              description: fi_FI
            - value: da_DK
              name: da_DK
              description: da_DK
            - value: no_NO
              name: no_NO
              description: no_NO
            - value: cs_CZ
              name: cs_CZ
              description: cs_CZ
            - value: hu_HU
              name: hu_HU
              description: hu_HU
            - value: ro_RO
              name: ro_RO
              description: ro_RO
            - value: el_GR
              name: el_GR
              description: el_GR
            - value: ms_MY
              name: ms_MY
              description: ms_MY
            - value: uk_UA
              name: uk_UA
              description: uk_UA
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        note:
          type: string
          description: 备注
          default: '##default'
        includes:
          type: array
          items:
            type: string
          description: 包含地址列表
          default: '##default'
        excludes:
          type: array
          items:
            type: string
          description: 排除地址列表
          default: '##default'
      x-apifox-orders:
        - unitId
        - amount
        - lang
        - coinId
        - network
        - note
        - includes
        - excludes
      required:
        - unitId
        - amount
        - coinId
        - network
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResult?:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          description: ''
          type: 'null'
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 7. 发起付款

`POST /api/third-party/payout/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/payout/{resourceAccessKey}:
    post:
      summary: 发起付款
      deprecated: false
      description: Get treasure unit address
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ThirdPayoutRequest'
              description: ''
            examples: {}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultWCCIPCmdAuditTask'
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '5':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-428012998-run
components:
  schemas:
    ThirdPayoutRequest:
      type: object
      properties:
        payTo:
          type: array
          items:
            $ref: '#/components/schemas/PayTo'
            description: com.cregis.custody.common.entity.transfer.PayTo
          description: 出金地址及信息列表
          default: '##default'
        from:
          type: string
          description: 出金地址
          default: '##default'
        unitId:
          type: integer
          description: 出金财务单元ID
          format: int64
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        operation:
          type: string
          description: 操作类型:withdraw/allocate/payout
          default: '##default'
        username:
          type: string
          description: 发起用户名
          default: '##default'
        userId:
          type: string
          description: 发起用户ID
          default: '##default'
        orderId:
          type: string
          description: 客户业务订单ID
          default: '##default'
        note:
          type: string
          description: 备注
          default: '##default'
        lang:
          type: string
          description: 语言
          default: '##default'
        initiator:
          type: string
          description: 任务发起人:邮箱/名称
          default: '##default'
        merchantType:
          type: string
          description: 业务类型
          enum:
            - NON_FINANCIAL_CORPORATE
            - REGULATED_VASP
            - INTERNAL_SYSTEM
          x-apifox-enum:
            - value: NON_FINANCIAL_CORPORATE
              name: NON_FINANCIAL_CORPORATE
              description: NON_FINANCIAL_CORPORATE
            - value: REGULATED_VASP
              name: REGULATED_VASP
              description: REGULATED_VASP
            - value: INTERNAL_SYSTEM
              name: INTERNAL_SYSTEM
              description: INTERNAL_SYSTEM
          default: '##default'
        travelRule:
          $ref: '#/components/schemas/TravelRuleRequest'
          description: Travel Rule信息
          default: '##default'
      x-apifox-orders:
        - payTo
        - from
        - unitId
        - coinId
        - network
        - operation
        - username
        - userId
        - orderId
        - note
        - lang
        - initiator
        - merchantType
        - travelRule
      required:
        - merchantType
        - travelRule
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    TravelRuleRequest:
      type: object
      properties:
        referenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        payload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
      x-apifox-orders:
        - referenceId
        - payload
      required:
        - referenceId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PayTo:
      type: object
      properties:
        to:
          type: string
          description: 转出地址
          default: '##default'
        amount:
          type: integer
          description: 付款金额
          default: '##default'
      x-apifox-orders:
        - to
        - amount
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultWCCIPCmdAuditTask:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/WCCIPCmdAuditTask'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    WCCIPCmdAuditTask:
      type: object
      properties:
        id:
          type: integer
          description: id
          format: int64
        taskId:
          type: string
          description: 任务ID
          default: '##default'
        vaultCode:
          type: string
          description: vault code
          default: '##default'
        projectId:
          type: integer
          description: ''
          format: int64
        accountId:
          type: string
          description: 金库的账户ID
          default: '##default'
        accountType:
          type: string
          description: 金库的账户类型
          enum:
            - GENERAL_ACQUIRING
            - SMART_ACQUIRING
            - SMART
            - GMA
            - TMA
            - GENERAL
          x-apifox-enum:
            - value: GENERAL_ACQUIRING
              name: GENERAL_ACQUIRING
              description: GENERAL, GAS_MANAGE, MANAGE, CA_MANAGE, CA
            - value: SMART_ACQUIRING
              name: SMART_ACQUIRING
              description: SMART_ACQUIRING
            - value: SMART
              name: SMART
              description: SMART
            - value: GMA
              name: GMA
              description: GMA
            - value: TMA
              name: TMA
              description: TMA
            - value: GENERAL
              name: GENERAL
              description: GENERAL
          default: '##default'
        submitter:
          type: string
          description: 提交人:在三方模式时是customer code/两方模式时是guard squad id
          default: '##default'
        ecode:
          type: string
          description: 企业code
          default: '##default'
        cmdType:
          type: string
          description: 命令类型
          default: '##default'
        cmdBasic: &ref_0
          $ref: '#/components/schemas/MapObject'
          description: 命令
          default: '##default'
        cmdForm: *ref_0
        businessId:
          type: string
          description: 业务id:主要是订单id
          default: '##default'
        state:
          type: string
          description: 任务状态
          enum:
            - AUDITING
            - REJECTED
            - AUDIT_REJECTED
            - AUDIT_PASSED
            - SIGNING
            - SIGN_FAILED
            - SIGN_SUCCEED
            - FAILED
            - WAITING
            - SIGN_REJECTED
            - ALL_BROADCAST_SUCCEED
            - PARTIALLY_BROADCAST_SUCCEED
            - ALL_BROADCAST_FAILED
            - BROADCAST_FAILED
            - BROADCAST_EXCEPTION
            - EXPIRED
          x-apifox-enum:
            - value: AUDITING
              name: AUDITING
              description: AUDITING
            - value: REJECTED
              name: REJECTED
              description: REJECTED
            - value: AUDIT_REJECTED
              name: AUDIT_REJECTED
              description: AUDIT_REJECTED
            - value: AUDIT_PASSED
              name: AUDIT_PASSED
              description: AUDIT_PASSED
            - value: SIGNING
              name: SIGNING
              description: SIGNING
            - value: SIGN_FAILED
              name: SIGN_FAILED
              description: SIGN_FAILED
            - value: SIGN_SUCCEED
              name: SIGN_SUCCEED
              description: SIGN_SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: WAITING
              name: WAITING
              description: WAITING
            - value: SIGN_REJECTED
              name: SIGN_REJECTED
              description: SIGN_REJECTED
            - value: ALL_BROADCAST_SUCCEED
              name: ALL_BROADCAST_SUCCEED
              description: ALL_BROADCAST_SUCCEED
            - value: PARTIALLY_BROADCAST_SUCCEED
              name: PARTIALLY_BROADCAST_SUCCEED
              description: PARTIALLY_BROADCAST_SUCCEED
            - value: ALL_BROADCAST_FAILED
              name: ALL_BROADCAST_FAILED
              description: ALL_BROADCAST_FAILED
            - value: BROADCAST_FAILED
              name: BROADCAST_FAILED
              description: BROADCAST_FAILED
            - value: BROADCAST_EXCEPTION
              name: BROADCAST_EXCEPTION
              description: BROADCAST_EXCEPTION
            - value: EXPIRED
              name: EXPIRED
              description: 过期
          default: '##default'
        businessType:
          type: string
          description: 业务类型:SYSTEM/BTC_TRANSFER等等
          default: '##default'
        taskType:
          type: string
          description: 任务类型,用于前端判断是资金还是系统操作:orders/issues
          default: '##default'
        createTime:
          type: string
          description: 任务创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 任务更新时间
          x-apifox-mock: '@datetime'
          default: '##default'
        signContent:
          type: string
          description: 签名内容
          default: '##default'
        signContentKeyMapping:
          type: string
          description: 签名内容的映射
          default: '##default'
        total:
          type: integer
          description: 总参与审批数量
        threshold:
          type: integer
          description: 门限
        signers:
          type: array
          items:
            type: string
          description: 任务参与者、审核人、审批人等
          default: '##default'
        algoType:
          type: string
          description: ''
          enum:
            - ECDSA
            - EC_SCHNORR
            - ED_DSA
            - UNASSIGNED
            - ED25519
          x-apifox-enum:
            - value: ECDSA
              name: ECDSA
              description: ECDSA
            - value: EC_SCHNORR
              name: EC_SCHNORR
              description: EC_SCHNORR
            - value: ED_DSA
              name: ED_DSA
              description: ED_DSA
            - value: UNASSIGNED
              name: UNASSIGNED
              description: UNASSIGNED
            - value: ED25519
              name: ED25519
              description: ED25519
        initiator:
          type: string
          description: 任务发起人
          default: '##default'
        taskOperation:
          type: string
          description: 任务操作,如转账,设置board等等
          enum:
            - DEPLOY_SMART_CONTRACT
            - PAYOUT
            - WITHDRAW
            - ALLOCATE
            - SET_WHITE_LIST
            - BOARD
            - FUND_FLOW
          x-apifox-enum:
            - value: DEPLOY_SMART_CONTRACT
              name: DEPLOY_SMART_CONTRACT
              description: deploy_smart_contract
            - value: PAYOUT
              name: PAYOUT
              description: payout
            - value: WITHDRAW
              name: WITHDRAW
              description: WITHDRAW
            - value: ALLOCATE
              name: ALLOCATE
              description: allocate
            - value: SET_WHITE_LIST
              name: SET_WHITE_LIST
              description: set_white_list
            - value: BOARD
              name: BOARD
              description: board
            - value: FUND_FLOW
              name: FUND_FLOW
              description: fundFlow
          default: '##default'
        signersLevel:
          type: integer
          description: ''
        coinId:
          type: string
          description: ''
        unitName:
          type: string
          description: ''
        accountName:
          type: string
          description: ''
        includes:
          type: array
          items:
            type: string
          description: ''
        sponsored:
          type: boolean
          description: ''
          default: false
        remark:
          type: string
          description: ''
      x-apifox-orders:
        - id
        - taskId
        - vaultCode
        - projectId
        - accountId
        - accountType
        - submitter
        - ecode
        - cmdType
        - cmdBasic
        - cmdForm
        - businessId
        - state
        - businessType
        - taskType
        - createTime
        - updateTime
        - signContent
        - signContentKeyMapping
        - total
        - threshold
        - signers
        - algoType
        - initiator
        - taskOperation
        - signersLevel
        - coinId
        - unitName
        - accountName
        - includes
        - sponsored
        - remark
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MapObject:
      type: object
      properties:
        key:
          $ref: '#/components/schemas/key'
      x-apifox-orders:
        - key
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    key:
      type: object
      properties: {}
      x-apifox-orders: []
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 8. 任务提交接口,针对三方平台使用

`POST /api/third-party/submit/task/{resourceAccessKey}/{taskId}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/submit/task/{resourceAccessKey}/{taskId}:
    post:
      summary: 任务提交接口,针对三方平台使用
      deprecated: false
      description: 一次直接提交
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: ''
          required: true
          schema:
            type: string
        - name: taskId
          in: path
          description: ''
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmitTaskDTO'
              description: 签名数据
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResult%3F'
                description: messageResult
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '5':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-428012999-run
components:
  schemas:
    SubmitTaskDTO:
      type: object
      properties:
        signatures:
          $ref: '#/components/schemas/MapListString'
          description: 签名结果：key为taskId，value为签名字符串列表
          default: '##default'
        confirmed:
          type: boolean
          description: 状态:同意/拒绝
          default: false
      x-apifox-orders:
        - signatures
        - confirmed
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MapListString:
      type: object
      properties:
        key:
          type: array
          items:
            type: string
      x-apifox-orders:
        - key
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResult?:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          description: ''
          type: 'null'
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 9. Query activities with pagination

`POST /api/third-party/activities/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/activities/{resourceAccessKey}:
    post:
      summary: Query activities with pagination
      deprecated: false
      description: >-
        分页查询活动记录

        Query activities with pagination

        Query activity records under the financial unit, including all fund
        activities such as pay-in, pay-out, transfer, etc.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: 资源访问密钥
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryParamProjectUnitActivity'
              description: 查询请求
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultPageProjectUnitActivity'
                description: 分页活动记录
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      records:
                        - id: 0
                          ecode: ''
                          projectId: 0
                          treasuryUnitId: 0
                          cusAccountId: 0
                          accountType: ''
                          cpAccountId: 0
                          coinId: ''
                          network: ''
                          type: ''
                          amount: 0
                          direction: ''
                          orderId: ''
                          businessId: ''
                          status: ''
                          travelRuleStatus: ''
                          kytStatus: ''
                          createTime: ''
                          updateTime: ''
                      total: 0
                      size: 0
                      current: 0
                      orders:
                        - column: ''
                          asc: false
                      optimizeCountSql: false
                      searchCount: false
                      optimizeJoinOfCountSql: false
                      maxLimit: 0
                      countId: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-434786885-run
components:
  schemas:
    QueryParamProjectUnitActivity:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultPageProjectUnitActivity:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/PageProjectUnitActivity'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageProjectUnitActivity:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitActivity'
            description: com.cregis.custody.common.entity.transfer.ProjectUnitActivity
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitActivity:
      type: object
      properties:
        id:
          type: integer
          description: ''
          format: int64
        ecode:
          type: string
          description: 商户号
          default: '##default'
        projectId:
          type: integer
          description: 项目ID
          format: int64
        treasuryUnitId:
          type: integer
          description: 账户单元ID
          format: int64
        cusAccountId:
          type: integer
          description: 发生交易的账户ID,出金就是from账户id,入金就是to账户id,这里是TrustVault账户id
          format: int64
        accountType:
          type: string
          description: 发生交易的账户名称出金就是from账户名,入金就是to账户名
          default: '##default'
        cpAccountId:
          type: integer
          description: 对向账户ID,与accountId对应,这里是Custody账户id
          format: int64
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        type:
          type: string
          description: 活动类型
          default: '##default'
        amount:
          type: integer
          description: 活动金额
          default: '##default'
        direction:
          type: string
          description: 资金流转方向:IN/OUT
          default: '##default'
        orderId:
          type: string
          description: 活动所属订单号
          default: '##default'
        businessId:
          type: string
          description: 第三方业务订单ID
          default: '##default'
        status:
          type: string
          description: 状态
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytStatus:
          type: string
          description: KYT 状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
        updateTime:
          type: string
          description: 更新时间
          x-apifox-mock: '@datetime'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - cusAccountId
        - accountType
        - cpAccountId
        - coinId
        - network
        - type
        - amount
        - direction
        - orderId
        - businessId
        - status
        - travelRuleStatus
        - kytStatus
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 10. Query transfer-out orders with pagination

`POST /api/third-party/transfer-out-orders/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/transfer-out-orders/{resourceAccessKey}:
    post:
      summary: Query transfer-out orders with pagination
      deprecated: false
      description: >-
        分页查询出金订单

        Query transfer-out orders with pagination

        Query transfer-out orders under the financial unit, including withdrawal
        and allocation orders.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: 资源访问密钥
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryParamProjectUnitTransferOutOrder'
              description: 查询请求
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/MessageResultPageProjectUnitTransferOutOrder
                description: 分页出金订单
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      records:
                        - ecode: ''
                          vaultCode: ''
                          projectId: 0
                          cusAccountId: 0
                          address: ''
                          coinId: ''
                          network: ''
                          businessScope: ''
                          travelRuleReferenceId: ''
                          travelRulePayload: ''
                          travelRuleStatus: ''
                          travelRuleCheckStatus: ''
                          travelRuleCheckPayload: ''
                          kytStatus: ''
                          kytRiskScore: 0
                          kytPayload: ''
                          complianceProvider: ''
                          orderId: ''
                          txId: ''
                          fee: ''
                          createTime: ''
                          updateTime: ''
                          id: 0
                          taskId: ''
                          inputAmount: ''
                          totalAmount: 0
                          fundFlowCode: ''
                          orderState: ''
                          payToList:
                            - to: ''
                              amount: 0
                          note: ''
                          businessId: ''
                      total: 0
                      size: 0
                      current: 0
                      orders:
                        - column: ''
                          asc: false
                      optimizeCountSql: false
                      searchCount: false
                      optimizeJoinOfCountSql: false
                      maxLimit: 0
                      countId: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-434786886-run
components:
  schemas:
    QueryParamProjectUnitTransferOutOrder:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultPageProjectUnitTransferOutOrder:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/PageProjectUnitTransferOutOrder'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageProjectUnitTransferOutOrder:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitTransferOutOrder'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitTransferOutOrder
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitTransferOutOrder:
      type: object
      properties:
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: 金库code
          default: '##default'
        projectId:
          type: integer
          description: 项目Id
          format: int64
        cusAccountId:
          type: integer
          description: 账户id
          format: int64
        address:
          type: string
          description: 交易地址
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 所在网络
          default: '##default'
        businessScope:
          type: string
          description: 托管业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        travelRuleReferenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        travelRulePayload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - PENDING
            - SUBMITTED
            - CONFIRMED
            - FAILED
          x-apifox-enum:
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: SUBMITTED
              name: SUBMITTED
              description: SUBMITTED
            - value: CONFIRMED
              name: CONFIRMED
              description: CONFIRMED
            - value: FAILED
              name: FAILED
              description: FAILED
          default: '##default'
        travelRuleCheckStatus:
          type: string
          description: Travel Rule 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        travelRuleCheckPayload:
          type: string
          description: Travel Rule 合规回执(JSON字符串)
          default: '##default'
        kytStatus:
          type: string
          description: KYT 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytRiskScore:
          type: integer
          description: KYT 风险评分
        kytPayload:
          type: string
          description: KYT 回执(JSON字符串)
          default: '##default'
        complianceProvider:
          type: string
          description: 合规提供方
          default: '##default'
        orderId:
          type: string
          description: 业务订单ID
          default: '##default'
        txId:
          type: string
          description: 链上ID,一般情况下为一条记录，有时候会出现多条记录
          default: '##default'
        fee:
          type: string
          description: 付款手续费
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        id:
          type: integer
          description: id
          format: int64
        taskId:
          type: string
          description: 审批任务ID
          default: '##default'
        inputAmount:
          type: string
          description: 可读金额
          default: '##default'
        totalAmount:
          type: integer
          description: 付款链上金额
          default: '##default'
        fundFlowCode:
          type: string
          description: 资金流水号
          default: '##default'
        orderState:
          type: string
          description: 订单状态：初始化，审批中，已拒绝，交易中，交易成功，交易失败
          enum:
            - AUDITING
            - SIGNING
            - SIGN_FAILED
            - SIGNING_REJECTED
            - TRANSITING
            - SUCCEED
            - FAILED
            - SUBMIT_FAILED
            - CONFIRMING
          x-apifox-enum:
            - value: AUDITING
              name: AUDITING
              description: AUDITING
            - value: SIGNING
              name: SIGNING
              description: AUDIT_REJECTED,
            - value: SIGN_FAILED
              name: SIGN_FAILED
              description: SIGN_FAILED
            - value: SIGNING_REJECTED
              name: SIGNING_REJECTED
              description: 签名拒绝
            - value: TRANSITING
              name: TRANSITING
              description: TRANSITING
            - value: SUCCEED
              name: SUCCEED
              description: SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: SUBMIT_FAILED
              name: SUBMIT_FAILED
              description: SUBMIT_FAILED
            - value: CONFIRMING
              name: CONFIRMING
              description: CONFIRMING
          default: '##default'
        payToList:
          type: array
          items:
            $ref: '#/components/schemas/PayTo'
            description: com.cregis.custody.common.entity.transfer.PayTo
          description: ''
        note:
          type: string
          description: 付款备注
          default: '##default'
        businessId:
          type: string
          description: 第三方业务订单ID
          default: '##default'
      x-apifox-orders:
        - ecode
        - vaultCode
        - projectId
        - cusAccountId
        - address
        - coinId
        - network
        - businessScope
        - travelRuleReferenceId
        - travelRulePayload
        - travelRuleStatus
        - travelRuleCheckStatus
        - travelRuleCheckPayload
        - kytStatus
        - kytRiskScore
        - kytPayload
        - complianceProvider
        - orderId
        - txId
        - fee
        - createTime
        - updateTime
        - id
        - taskId
        - inputAmount
        - totalAmount
        - fundFlowCode
        - orderState
        - payToList
        - note
        - businessId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PayTo:
      type: object
      properties:
        to:
          type: string
          description: 转出地址
          default: '##default'
        amount:
          type: integer
          description: 付款金额
          default: '##default'
      x-apifox-orders:
        - to
        - amount
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 11. Query transfer-in orders with pagination

`POST /api/third-party/transfer-in-orders/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/transfer-in-orders/{resourceAccessKey}:
    post:
      summary: Query transfer-in orders with pagination
      deprecated: false
      description: >-
        分页查询入金订单

        Query transfer-in orders with pagination

        Query transfer-in orders under the financial unit, including deposit and
        collection orders.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: 资源访问密钥
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryParamProjectUnitTransferInOrder'
              description: 查询请求
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/MessageResultPageProjectUnitTransferInOrder
                description: 分页入金订单
              examples:
                '1':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '2':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '3':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data: null
                '4':
                  summary: 成功示例
                  value:
                    code: 0
                    message: ''
                    data:
                      records:
                        - ecode: ''
                          vaultCode: ''
                          projectId: 0
                          cusAccountId: 0
                          address: ''
                          coinId: ''
                          network: ''
                          businessScope: ''
                          travelRuleReferenceId: ''
                          travelRulePayload: ''
                          travelRuleStatus: ''
                          travelRuleCheckStatus: ''
                          travelRuleCheckPayload: ''
                          kytStatus: ''
                          kytRiskScore: 0
                          kytPayload: ''
                          complianceProvider: ''
                          orderId: ''
                          txId: ''
                          fee: ''
                          createTime: ''
                          updateTime: ''
                          id: 0
                          cpAddress: ''
                          amount: 0
                          orderState: ''
                          type: 0
                          note: ''
                          initiator: 0
                      total: 0
                      size: 0
                      current: 0
                      orders:
                        - column: ''
                          asc: false
                      optimizeCountSql: false
                      searchCount: false
                      optimizeJoinOfCountSql: false
                      maxLimit: 0
                      countId: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-434786887-run
components:
  schemas:
    QueryParamProjectUnitTransferInOrder:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultPageProjectUnitTransferInOrder:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/PageProjectUnitTransferInOrder'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageProjectUnitTransferInOrder:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitTransferInOrder'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitTransferInOrder
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitTransferInOrder:
      type: object
      properties:
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: 金库code
          default: '##default'
        projectId:
          type: integer
          description: 项目Id
          format: int64
        cusAccountId:
          type: integer
          description: 账户id
          format: int64
        address:
          type: string
          description: 交易地址
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 所在网络
          default: '##default'
        businessScope:
          type: string
          description: 托管业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        travelRuleReferenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        travelRulePayload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - PENDING
            - SUBMITTED
            - CONFIRMED
            - FAILED
          x-apifox-enum:
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: SUBMITTED
              name: SUBMITTED
              description: SUBMITTED
            - value: CONFIRMED
              name: CONFIRMED
              description: CONFIRMED
            - value: FAILED
              name: FAILED
              description: FAILED
          default: '##default'
        travelRuleCheckStatus:
          type: string
          description: Travel Rule 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        travelRuleCheckPayload:
          type: string
          description: Travel Rule 合规回执(JSON字符串)
          default: '##default'
        kytStatus:
          type: string
          description: KYT 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytRiskScore:
          type: integer
          description: KYT 风险评分
        kytPayload:
          type: string
          description: KYT 回执(JSON字符串)
          default: '##default'
        complianceProvider:
          type: string
          description: 合规提供方
          default: '##default'
        orderId:
          type: string
          description: 业务订单ID
          default: '##default'
        txId:
          type: string
          description: 链上ID,一般情况下为一条记录，有时候会出现多条记录
          default: '##default'
        fee:
          type: string
          description: 付款手续费
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        id:
          type: integer
          description: id
          format: int64
        cpAddress:
          type: string
          description: 付款地址
          default: '##default'
        amount:
          type: integer
          description: 收款金额
          default: '##default'
        orderState:
          type: string
          description: 订单状态：交易中，交易成功，交易失败
          enum:
            - PROCESSING
            - CONFIRMING
            - SUCCEED
            - FAILED
            - MISMATCH
            - EXPIRED
          x-apifox-enum:
            - value: PROCESSING
              name: PROCESSING
              description: PROCESSING
            - value: CONFIRMING
              name: CONFIRMING
              description: CONFIRMING
            - value: SUCCEED
              name: SUCCEED
              description: SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: MISMATCH
              name: MISMATCH
              description: MISMATCH
            - value: EXPIRED
              name: EXPIRED
              description: EXPIRED
          default: '##default'
        type:
          type: integer
          description: 订单类型：1.充值，2.收款
        note:
          type: string
          description: 收款备注
          default: '##default'
        initiator:
          type: integer
          description: 发起方:1.商户,2.商户的用户
      x-apifox-orders:
        - ecode
        - vaultCode
        - projectId
        - cusAccountId
        - address
        - coinId
        - network
        - businessScope
        - travelRuleReferenceId
        - travelRulePayload
        - travelRuleStatus
        - travelRuleCheckStatus
        - travelRuleCheckPayload
        - kytStatus
        - kytRiskScore
        - kytPayload
        - complianceProvider
        - orderId
        - txId
        - fee
        - createTime
        - updateTime
        - id
        - cpAddress
        - amount
        - orderState
        - type
        - note
        - initiator
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 12. 账户级流水

`POST /api/third-party/fund-records/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/fund-records/{resourceAccessKey}:
    post:
      summary: 账户级流水
      deprecated: false
      description: >-
        分页查询资金流水

        Query fund records with pagination

        Query fund flow records under the financial unit, recording details of
        each fund change.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: 资源访问密钥
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryParamProjectUnitFundRecord'
              description: 查询请求
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResultPageProjectUnitFundRecord'
                description: 分页资金流水
              example:
                code: 0
                message: ''
                data:
                  records:
                    - id: 0
                      ecode: ''
                      projectId: 0
                      treasuryUnitId: 0
                      cusAccountId: 0
                      txId: ''
                      coinId: ''
                      network: ''
                      amount: 0
                      preBalance: 0
                      postBalance: 0
                      fee: ''
                      txType: ''
                      createTime: ''
                  total: 0
                  size: 0
                  current: 0
                  orders:
                    - column: ''
                      asc: false
                  optimizeCountSql: false
                  searchCount: false
                  optimizeJoinOfCountSql: false
                  maxLimit: 0
                  countId: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-434821819-run
components:
  schemas:
    QueryParamProjectUnitFundRecord:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultPageProjectUnitFundRecord:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/PageProjectUnitFundRecord'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageProjectUnitFundRecord:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitFundRecord'
            description: com.cregis.custody.common.entity.transfer.ProjectUnitFundRecord
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitFundRecord:
      type: object
      properties:
        id:
          type: integer
          description: 主键id
          format: int64
        ecode:
          type: string
          description: 商户编码
          default: '##default'
        projectId:
          type: integer
          description: 账户组code
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        cusAccountId:
          type: integer
          description: 对应账户id
          format: int64
        txId:
          type: string
          description: 交易ID
          default: '##default'
        coinId:
          type: string
          description: 币种
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        amount:
          type: integer
          description: 金额
          default: '##default'
        preBalance:
          type: integer
          description: 期初余额
          default: '##default'
        postBalance:
          type: integer
          description: 期末余额
          default: '##default'
        fee:
          type: string
          description: 手续费
          default: '##default'
        txType:
          type: string
          description: 流水类型
          enum:
            - TRANSFER_IN
            - TRANSFER_OUT
            - ALLOCATE_IN
            - ALLOCATE_OUT
            - POOL_IN
            - POOL_OUT
            - GAS_OUT
            - FEE_OUT
          x-apifox-enum:
            - value: TRANSFER_IN
              name: TRANSFER_IN
              description: TRANSFER_IN
            - value: TRANSFER_OUT
              name: TRANSFER_OUT
              description: TRANSFER_OUT
            - value: ALLOCATE_IN
              name: ALLOCATE_IN
              description: ALLOCATE_IN
            - value: ALLOCATE_OUT
              name: ALLOCATE_OUT
              description: ALLOCATE_OUT
            - value: POOL_IN
              name: POOL_IN
              description: POOL_IN
            - value: POOL_OUT
              name: POOL_OUT
              description: POOL_OUT
            - value: GAS_OUT
              name: GAS_OUT
              description: GAS_OUT
            - value: FEE_OUT
              name: FEE_OUT
              description: FEE_OUT
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - cusAccountId
        - txId
        - coinId
        - network
        - amount
        - preBalance
        - postBalance
        - fee
        - txType
        - createTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## 13. 财务单元级流水

`POST /api/third-party/unit-fund-records/{resourceAccessKey}`

<details>
<summary>OpenAPI Specification (click to expand)</summary>

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/third-party/unit-fund-records/{resourceAccessKey}:
    post:
      summary: 财务单元级流水
      deprecated: false
      description: >-
        分页查询财务单元级资金流水

        Query fund records with pagination

        Query fund flow records under the financial unit, recording details of
        each fund change.
      tags:
        - Third-Party 财务单元管理
      parameters:
        - name: resourceAccessKey
          in: path
          description: 资源访问密钥
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QueryParamProjectUnitLedgerFundRecord'
              description: 查询请求
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/MessageResultPageProjectUnitLedgerFundRecord
                description: 分页资金流水
              example:
                code: 0
                message: ''
                data:
                  records:
                    - id: 0
                      ecode: ''
                      projectId: 0
                      treasuryUnitId: 0
                      ledgerId: 0
                      txId: ''
                      orderId: ''
                      coinId: ''
                      network: ''
                      amount: 0
                      preBalance: 0
                      postBalance: 0
                      fee: ''
                      txType: ''
                      createTime: ''
                  total: 0
                  size: 0
                  current: 0
                  orders:
                    - column: ''
                      asc: false
                  optimizeCountSql: false
                  searchCount: false
                  optimizeJoinOfCountSql: false
                  maxLimit: 0
                  countId: ''
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: Third-Party 财务单元管理
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7939782/apis/api-445019640-run
components:
  schemas:
    QueryParamProjectUnitLedgerFundRecord:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    MessageResultPageProjectUnitLedgerFundRecord:
      type: object
      properties:
        code:
          type: integer
          description: ''
        message:
          type: string
          description: ''
        data:
          $ref: '#/components/schemas/PageProjectUnitLedgerFundRecord'
          description: ''
      x-apifox-orders:
        - code
        - message
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageProjectUnitLedgerFundRecord:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitLedgerFundRecord'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitLedgerFundRecord
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    ProjectUnitLedgerFundRecord:
      type: object
      properties:
        id:
          type: integer
          description: 主键id
          format: int64
        ecode:
          type: string
          description: 商户编码
          default: '##default'
        projectId:
          type: integer
          description: 账户组code
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        ledgerId:
          type: integer
          description: 对应账本id
          format: int64
        txId:
          type: string
          description: 交易ID
          default: '##default'
        orderId:
          type: string
          description: 订单id
          default: '##default'
        coinId:
          type: string
          description: 币种
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        amount:
          type: integer
          description: 金额
          default: '##default'
        preBalance:
          type: integer
          description: 期初余额
          default: '##default'
        postBalance:
          type: integer
          description: 期末余额
          default: '##default'
        fee:
          type: string
          description: 手续费
          default: '##default'
        txType:
          type: string
          description: 流水类型
          enum:
            - TRANSFER_IN
            - TRANSFER_OUT
            - WITHDRAW
            - ALLOCATE_IN
            - ALLOCATE_OUT
            - POOL_IN
            - POOL_OUT
            - GAS_OUT
            - FEE_OUT
          x-apifox-enum:
            - value: TRANSFER_IN
              name: TRANSFER_IN
              description: TRANSFER_IN
            - value: TRANSFER_OUT
              name: TRANSFER_OUT
              description: TRANSFER_OUT
            - value: WITHDRAW
              name: WITHDRAW
              description: WITHDRAW
            - value: ALLOCATE_IN
              name: ALLOCATE_IN
              description: ALLOCATE_IN
            - value: ALLOCATE_OUT
              name: ALLOCATE_OUT
              description: ALLOCATE_OUT
            - value: POOL_IN
              name: POOL_IN
              description: POOL_IN
            - value: POOL_OUT
              name: POOL_OUT
              description: POOL_OUT
            - value: GAS_OUT
              name: GAS_OUT
              description: GAS_OUT
            - value: FEE_OUT
              name: FEE_OUT
              description: FEE_OUT
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - ledgerId
        - txId
        - orderId
        - coinId
        - network
        - amount
        - preBalance
        - postBalance
        - fee
        - txType
        - createTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers:
  - url: http://api.vaulink.com/custody-backend
    description: 测试环境
security: []

```
</details>

---

## Data Schemas

> The following schemas are referenced across all endpoints.


### AccountData

```yaml
    AccountData:
      type: object
      properties:
        account_name:
          type: string
          description: ''
        account_type:
          type: string
          description: ''
      x-apifox-orders:
        - account_name
        - account_type
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### AnyCallRule

```yaml
    AnyCallRule:
      type: object
      properties:
        guardians:
          type: array
          items:
            type: string
          description: 护卫队成员
        threshold:
          type: string
          description: 护卫队的操作门限
        allowedCommands:
          type: array
          items:
            type: string
          description: 允许执行的指令列表
        allowed_commands:
          type: array
          items:
            type: string
          description: ''
      x-apifox-orders:
        - guardians
        - threshold
        - allowedCommands
        - allowed_commands
      required:
        - guardians
        - threshold
        - allowedCommands
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### CoinDto

```yaml
    CoinDto:
      type: object
      properties:
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
      x-apifox-orders:
        - coinId
        - network
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### CreateProjectTreasuryUnitSmartRequest

```yaml
    CreateProjectTreasuryUnitSmartRequest:
      type: object
      properties:
        unitName:
          type: string
          description: 财务单元名称
          default: '##default'
        businessScope:
          type: string
          description: 业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        businessPurpose:
          type: string
          description: 业务用途
          default: '##default'
        topology:
          type: string
          description: 账本拓扑结构模型（决定底层建立几个账户）
          enum:
            - ORBIT
            - SINGLE_GENERAL
            - QUAD_SMART_ISOLATION
          x-apifox-enum:
            - value: ORBIT
              name: ORBIT
              description: orbit财务单元
            - value: SINGLE_GENERAL
              name: SINGLE_GENERAL
              description: |-
                单一普通账户模型 (Single General Account)
                适用于：系统Gas池、简单的大额对公财资划转、历史 ORBIT 模式。
                行为：只建 1 个 PRIMARY 账户，类型为 GENERAL。不需要部署合约工厂。
            - value: QUAD_SMART_ISOLATION
              name: QUAD_SMART_ISOLATION
              description: >-
                四账户智能隔离模型 (Quad Smart Accounts)
```

### FundControl

```yaml
    FundControl:
      type: object
      properties:
        coinId:
          type: string
          description: 币种名称
        fundControlRules:
          type: array
          items:
            $ref: '#/components/schemas/FundControlRule'
            description: com.spark.support.wccip.dto.FundControlRule
          description: 金额约束信息
      x-apifox-orders:
        - coinId
        - fundControlRules
      required:
        - coinId
        - fundControlRules
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### FundControlRule

```yaml
    FundControlRule:
      type: object
      properties:
        guardians:
          type: array
          items:
            type: string
          description: 护卫队成员
        threshold:
          type: string
          description: 护卫队的操作门限
        perTransferLimit:
          type: string
          description: 单笔限额
        dailyTransferLimit:
          type: string
          description: 单日限额
      x-apifox-orders:
        - guardians
        - threshold
        - perTransferLimit
        - dailyTransferLimit
      required:
        - guardians
        - threshold
        - perTransferLimit
        - dailyTransferLimit
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### MapListString

```yaml
    MapListString:
      type: object
      properties:
        key:
          type: array
          items:
            type: string
      x-apifox-orders:
        - key
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### MapObject

```yaml
    MapObject:
      type: object
      properties:
        key:
          $ref: '#/components/schemas/key'
      x-apifox-orders:
        - key
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### OrderItem

```yaml
    OrderItem:
      type: object
      properties:
        column:
          type: string
          description: ''
        asc:
          type: boolean
          description: ''
      x-apifox-orders:
        - column
        - asc
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PageProjectUnitActivity

```yaml
    PageProjectUnitActivity:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitActivity'
            description: com.cregis.custody.common.entity.transfer.ProjectUnitActivity
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PageProjectUnitFundRecord

```yaml
    PageProjectUnitFundRecord:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitFundRecord'
            description: com.cregis.custody.common.entity.transfer.ProjectUnitFundRecord
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PageProjectUnitLedgerFundRecord

```yaml
    PageProjectUnitLedgerFundRecord:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitLedgerFundRecord'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitLedgerFundRecord
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PageProjectUnitTransferInOrder

```yaml
    PageProjectUnitTransferInOrder:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitTransferInOrder'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitTransferInOrder
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PageProjectUnitTransferOutOrder

```yaml
    PageProjectUnitTransferOutOrder:
      type: object
      properties:
        records:
          type: array
          items:
            $ref: '#/components/schemas/ProjectUnitTransferOutOrder'
            description: >-
              com.cregis.custody.common.entity.transfer.ProjectUnitTransferOutOrder
          description: ''
        total:
          type: integer
          description: ''
          format: int64
        size:
          type: integer
          description: ''
          format: int64
        current:
          type: integer
          description: ''
          format: int64
        orders:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
            description: com.baomidou.mybatisplus.core.metadata.OrderItem
          description: ''
        optimizeCountSql:
          type: boolean
          description: ''
        searchCount:
          type: boolean
          description: ''
        optimizeJoinOfCountSql:
          type: boolean
          description: ''
        maxLimit:
          type: integer
          description: ''
          format: int64
        countId:
          type: string
          description: ''
      x-apifox-orders:
        - records
        - total
        - size
        - current
        - orders
        - optimizeCountSql
        - searchCount
        - optimizeJoinOfCountSql
        - maxLimit
        - countId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### PayTo

```yaml
    PayTo:
      type: object
      properties:
        to:
          type: string
          description: 转出地址
          default: '##default'
        amount:
          type: integer
          description: 付款金额
          default: '##default'
      x-apifox-orders:
        - to
        - amount
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnit

```yaml
    ProjectUnit:
      type: object
      properties:
        id:
          type: integer
          description: ID
          format: int64
        ecode:
          type: string
          description: 企业code
          default: '##default'
        projectId:
          type: integer
          description: 项目ID
          format: int64
        name:
          type: string
          description: 名字
          default: '##default'
        ubo:
          type: string
          description: 最终受益人的ecode，如果是三方模式，是另外一个企业ID，否则就是自己的企业ID
          default: '##default'
        custodyServiceMode:
          type: string
          description: 托管接入模式
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        coinIds:
          type: array
          items: *ref_2
          description: 币种集合
          default: '##default'
        accounts:
          type: array
          items:
            $ref: '#/components/schemas/AccountData'
            description: com.spark.support.wccip.dto.AccountData
          description: 账户列表
          default: '##default'
        businessPurpose:
          type: string
          description: 业务用途
          default: '##default'
        status:
          type: string
          description: ''
          default: Active
        sort:
          type: integer
          description: 排序
        creationType:
          type: string
          description: '创建类型: PLATFORM/THIRD_PARTY'
          enum:
            - PLATFORM
            - THIRD_PARTY
          x-apifox-enum:
            - value: PLATFORM
              name: PLATFORM
              description: 平台直接创建
            - value: THIRD_PARTY
              name: THIRD_PARTY
              description: 三方平台创建
          default: '##default'
        developerId:
          type: string
          description: 三方平台开发者ID
          default: '##default'
        creatorId:
          type: integer
          description: 创建人
          format: int64
        remark:
          type: string
          description: 备注
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 更新时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - name
        - ubo
        - custodyServiceMode
        - coinIds
        - accounts
        - businessPurpose
        - status
        - sort
        - creationType
        - developerId
        - creatorId
        - remark
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitAccount

```yaml
    ProjectUnitAccount:
      type: object
      properties:
        id:
          type: integer
          description: id
          format: int64
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: vault code
          default: '##default'
        vaultAccountId:
          type: string
          description: 对应trustVault账户id
          default: '##default'
        projectId:
          type: integer
          description: 所属项目ID
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        accountName:
          type: string
          description: 账户名称
          default: '##default'
        fundFlowCode:
          type: string
          description: fundFlow code
          default: '##default'
        anycallCode:
          type: string
          description: anycall code
          default: '##default'
        autoSignUrl:
          type: string
          description: |-
            auto_sign_url
            自动签入地址
          default: '##default'
        balance:
          type: integer
          description: 主账户余额
          default: '##default'
        freezeBalance:
          type: integer
          description: 冻结余额
          default: '##default'
        holdBalance:
          type: integer
          description: 隔离余额（合规待确认/待复核的入金隔离资金）
          default: '##default'
        coinId:
          type: string
          description: 管理的资产类型
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        type:
          type: string
          description: 账户类型
          enum:
            - FREEZE
            - DEPOSIT
            - PRIMARY
            - RECEIVABLE
            - PAYOUT
            - PAYIN
            - GENERAL_GAS
            - QUARANTINE
            - DIRTY
          x-apifox-enum:
            - value: FREEZE
              name: FREEZE
              description: FREEZE
            - value: DEPOSIT
              name: DEPOSIT
              description: 以下是业务账户区分,不与trust Vault相关
            - value: PRIMARY
              name: PRIMARY
              description: 主账户
            - value: RECEIVABLE
              name: RECEIVABLE
              description: 入金账户 EOA
            - value: PAYOUT
              name: PAYOUT
              description: 出金账户
            - value: PAYIN
              name: PAYIN
              description: 用户付款账户，即商户收款 CA
            - value: GENERAL_GAS
              name: GENERAL_GAS
              description: GENERAL_GAS
            - value: QUARANTINE
              name: QUARANTINE
              description: 风险隔离账户，用于承接待复核/待处置的风险资金
            - value: DIRTY
              name: DIRTY
              description: 兼容历史数据与旧实现命名，请勿在新逻辑中继续使用
          default: '##default'
        status:
          type: integer
          description: 状态:0不可用,1可用
        income:
          type: integer
          description: 账户总入金
          default: '##default'
        outcome:
          type: integer
          description: 账户总出金
          default: '##default'
        isSmart:
          type: boolean
          description: 是否是智能账户
          default: false
        remark:
          type: string
          description: 备注
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - vaultCode
        - vaultAccountId
        - projectId
        - treasuryUnitId
        - accountName
        - fundFlowCode
        - anycallCode
        - autoSignUrl
        - balance
        - freezeBalance
        - holdBalance
        - coinId
        - network
        - type
        - status
        - income
        - outcome
        - isSmart
        - remark
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitActivity

```yaml
    ProjectUnitActivity:
      type: object
      properties:
        id:
          type: integer
          description: ''
          format: int64
        ecode:
          type: string
          description: 商户号
          default: '##default'
        projectId:
          type: integer
          description: 项目ID
          format: int64
        treasuryUnitId:
          type: integer
          description: 账户单元ID
          format: int64
        cusAccountId:
          type: integer
          description: 发生交易的账户ID,出金就是from账户id,入金就是to账户id,这里是TrustVault账户id
          format: int64
        accountType:
          type: string
          description: 发生交易的账户名称出金就是from账户名,入金就是to账户名
          default: '##default'
        cpAccountId:
          type: integer
          description: 对向账户ID,与accountId对应,这里是Custody账户id
          format: int64
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        type:
          type: string
          description: 活动类型
          default: '##default'
        amount:
          type: integer
          description: 活动金额
          default: '##default'
        direction:
          type: string
          description: 资金流转方向:IN/OUT
          default: '##default'
        orderId:
          type: string
          description: 活动所属订单号
          default: '##default'
        businessId:
          type: string
          description: 第三方业务订单ID
          default: '##default'
        status:
          type: string
          description: 状态
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytStatus:
          type: string
          description: KYT 状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
        updateTime:
          type: string
          description: 更新时间
          x-apifox-mock: '@datetime'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - cusAccountId
        - accountType
        - cpAccountId
        - coinId
        - network
        - type
        - amount
        - direction
        - orderId
        - businessId
        - status
        - travelRuleStatus
        - kytStatus
        - createTime
        - updateTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitFundRecord

```yaml
    ProjectUnitFundRecord:
      type: object
      properties:
        id:
          type: integer
          description: 主键id
          format: int64
        ecode:
          type: string
          description: 商户编码
          default: '##default'
        projectId:
          type: integer
          description: 账户组code
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        cusAccountId:
          type: integer
          description: 对应账户id
          format: int64
        txId:
          type: string
          description: 交易ID
          default: '##default'
        coinId:
          type: string
          description: 币种
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        amount:
          type: integer
          description: 金额
          default: '##default'
        preBalance:
          type: integer
          description: 期初余额
          default: '##default'
        postBalance:
          type: integer
          description: 期末余额
          default: '##default'
        fee:
          type: string
          description: 手续费
          default: '##default'
        txType:
          type: string
          description: 流水类型
          enum:
            - TRANSFER_IN
            - TRANSFER_OUT
            - ALLOCATE_IN
            - ALLOCATE_OUT
            - POOL_IN
            - POOL_OUT
            - GAS_OUT
            - FEE_OUT
          x-apifox-enum:
            - value: TRANSFER_IN
              name: TRANSFER_IN
              description: TRANSFER_IN
            - value: TRANSFER_OUT
              name: TRANSFER_OUT
              description: TRANSFER_OUT
            - value: ALLOCATE_IN
              name: ALLOCATE_IN
              description: ALLOCATE_IN
            - value: ALLOCATE_OUT
              name: ALLOCATE_OUT
              description: ALLOCATE_OUT
            - value: POOL_IN
              name: POOL_IN
              description: POOL_IN
            - value: POOL_OUT
              name: POOL_OUT
              description: POOL_OUT
            - value: GAS_OUT
              name: GAS_OUT
              description: GAS_OUT
            - value: FEE_OUT
              name: FEE_OUT
              description: FEE_OUT
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - cusAccountId
        - txId
        - coinId
        - network
        - amount
        - preBalance
        - postBalance
        - fee
        - txType
        - createTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitLedgerFundRecord

```yaml
    ProjectUnitLedgerFundRecord:
      type: object
      properties:
        id:
          type: integer
          description: 主键id
          format: int64
        ecode:
          type: string
          description: 商户编码
          default: '##default'
        projectId:
          type: integer
          description: 账户组code
          format: int64
        treasuryUnitId:
          type: integer
          description: 所属财务单元id
          format: int64
        ledgerId:
          type: integer
          description: 对应账本id
          format: int64
        txId:
          type: string
          description: 交易ID
          default: '##default'
        orderId:
          type: string
          description: 订单id
          default: '##default'
        coinId:
          type: string
          description: 币种
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        amount:
          type: integer
          description: 金额
          default: '##default'
        preBalance:
          type: integer
          description: 期初余额
          default: '##default'
        postBalance:
          type: integer
          description: 期末余额
          default: '##default'
        fee:
          type: string
          description: 手续费
          default: '##default'
        txType:
          type: string
          description: 流水类型
          enum:
            - TRANSFER_IN
            - TRANSFER_OUT
            - WITHDRAW
            - ALLOCATE_IN
            - ALLOCATE_OUT
            - POOL_IN
            - POOL_OUT
            - GAS_OUT
            - FEE_OUT
          x-apifox-enum:
            - value: TRANSFER_IN
              name: TRANSFER_IN
              description: TRANSFER_IN
            - value: TRANSFER_OUT
              name: TRANSFER_OUT
              description: TRANSFER_OUT
            - value: WITHDRAW
              name: WITHDRAW
              description: WITHDRAW
            - value: ALLOCATE_IN
              name: ALLOCATE_IN
              description: ALLOCATE_IN
            - value: ALLOCATE_OUT
              name: ALLOCATE_OUT
              description: ALLOCATE_OUT
            - value: POOL_IN
              name: POOL_IN
              description: POOL_IN
            - value: POOL_OUT
              name: POOL_OUT
              description: POOL_OUT
            - value: GAS_OUT
              name: GAS_OUT
              description: GAS_OUT
            - value: FEE_OUT
              name: FEE_OUT
              description: FEE_OUT
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
      x-apifox-orders:
        - id
        - ecode
        - projectId
        - treasuryUnitId
        - ledgerId
        - txId
        - orderId
        - coinId
        - network
        - amount
        - preBalance
        - postBalance
        - fee
        - txType
        - createTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitTransferInOrder

```yaml
    ProjectUnitTransferInOrder:
      type: object
      properties:
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: 金库code
          default: '##default'
        projectId:
          type: integer
          description: 项目Id
          format: int64
        cusAccountId:
          type: integer
          description: 账户id
          format: int64
        address:
          type: string
          description: 交易地址
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 所在网络
          default: '##default'
        businessScope:
          type: string
          description: 托管业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        travelRuleReferenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        travelRulePayload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - PENDING
            - SUBMITTED
            - CONFIRMED
            - FAILED
          x-apifox-enum:
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: SUBMITTED
              name: SUBMITTED
              description: SUBMITTED
            - value: CONFIRMED
              name: CONFIRMED
              description: CONFIRMED
            - value: FAILED
              name: FAILED
              description: FAILED
          default: '##default'
        travelRuleCheckStatus:
          type: string
          description: Travel Rule 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        travelRuleCheckPayload:
          type: string
          description: Travel Rule 合规回执(JSON字符串)
          default: '##default'
        kytStatus:
          type: string
          description: KYT 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytRiskScore:
          type: integer
          description: KYT 风险评分
        kytPayload:
          type: string
          description: KYT 回执(JSON字符串)
          default: '##default'
        complianceProvider:
          type: string
          description: 合规提供方
          default: '##default'
        orderId:
          type: string
          description: 业务订单ID
          default: '##default'
        txId:
          type: string
          description: 链上ID,一般情况下为一条记录，有时候会出现多条记录
          default: '##default'
        fee:
          type: string
          description: 付款手续费
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        id:
          type: integer
          description: id
          format: int64
        cpAddress:
          type: string
          description: 付款地址
          default: '##default'
        amount:
          type: integer
          description: 收款金额
          default: '##default'
        orderState:
          type: string
          description: 订单状态：交易中，交易成功，交易失败
          enum:
            - PROCESSING
            - CONFIRMING
            - SUCCEED
            - FAILED
            - MISMATCH
            - EXPIRED
          x-apifox-enum:
            - value: PROCESSING
              name: PROCESSING
              description: PROCESSING
            - value: CONFIRMING
              name: CONFIRMING
              description: CONFIRMING
            - value: SUCCEED
              name: SUCCEED
              description: SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: MISMATCH
              name: MISMATCH
              description: MISMATCH
            - value: EXPIRED
              name: EXPIRED
              description: EXPIRED
          default: '##default'
        type:
          type: integer
          description: 订单类型：1.充值，2.收款
        note:
          type: string
          description: 收款备注
          default: '##default'
        initiator:
          type: integer
          description: 发起方:1.商户,2.商户的用户
      x-apifox-orders:
        - ecode
        - vaultCode
        - projectId
        - cusAccountId
        - address
        - coinId
        - network
        - businessScope
        - travelRuleReferenceId
        - travelRulePayload
        - travelRuleStatus
        - travelRuleCheckStatus
        - travelRuleCheckPayload
        - kytStatus
        - kytRiskScore
        - kytPayload
        - complianceProvider
        - orderId
        - txId
        - fee
        - createTime
        - updateTime
        - id
        - cpAddress
        - amount
        - orderState
        - type
        - note
        - initiator
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ProjectUnitTransferOutOrder

```yaml
    ProjectUnitTransferOutOrder:
      type: object
      properties:
        ecode:
          type: string
          description: 企业code
          default: '##default'
        vaultCode:
          type: string
          description: 金库code
          default: '##default'
        projectId:
          type: integer
          description: 项目Id
          format: int64
        cusAccountId:
          type: integer
          description: 账户id
          format: int64
        address:
          type: string
          description: 交易地址
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 所在网络
          default: '##default'
        businessScope:
          type: string
          description: 托管业务类型
          enum:
            - DEDICATED_ACCOUNT
            - OMNIBUS_ACCOUNT
            - OPEN_API_PROXY
          x-apifox-enum:
            - value: DEDICATED_ACCOUNT
              name: DEDICATED_ACCOUNT
              description: DEDICATED_ACCOUNT
            - value: OMNIBUS_ACCOUNT
              name: OMNIBUS_ACCOUNT
              description: OMNIBUS_ACCOUNT
            - value: OPEN_API_PROXY
              name: OPEN_API_PROXY
              description: OPEN_API_PROXY
          default: '##default'
        travelRuleReferenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        travelRulePayload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
        travelRuleStatus:
          type: string
          description: Travel Rule 状态
          enum:
            - PENDING
            - SUBMITTED
            - CONFIRMED
            - FAILED
          x-apifox-enum:
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: SUBMITTED
              name: SUBMITTED
              description: SUBMITTED
            - value: CONFIRMED
              name: CONFIRMED
              description: CONFIRMED
            - value: FAILED
              name: FAILED
              description: FAILED
          default: '##default'
        travelRuleCheckStatus:
          type: string
          description: Travel Rule 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        travelRuleCheckPayload:
          type: string
          description: Travel Rule 合规回执(JSON字符串)
          default: '##default'
        kytStatus:
          type: string
          description: KYT 合规状态
          enum:
            - NOT_REQUIRED
            - PENDING
            - PASSED
            - FAILED
            - REVIEW
          x-apifox-enum:
            - value: NOT_REQUIRED
              name: NOT_REQUIRED
              description: NOT_REQUIRED
            - value: PENDING
              name: PENDING
              description: PENDING
            - value: PASSED
              name: PASSED
              description: PASSED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: REVIEW
              name: REVIEW
              description: REVIEW
          default: '##default'
        kytRiskScore:
          type: integer
          description: KYT 风险评分
        kytPayload:
          type: string
          description: KYT 回执(JSON字符串)
          default: '##default'
        complianceProvider:
          type: string
          description: 合规提供方
          default: '##default'
        orderId:
          type: string
          description: 业务订单ID
          default: '##default'
        txId:
          type: string
          description: 链上ID,一般情况下为一条记录，有时候会出现多条记录
          default: '##default'
        fee:
          type: string
          description: 付款手续费
          default: '##default'
        createTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        id:
          type: integer
          description: id
          format: int64
        taskId:
          type: string
          description: 审批任务ID
          default: '##default'
        inputAmount:
          type: string
          description: 可读金额
          default: '##default'
        totalAmount:
          type: integer
          description: 付款链上金额
          default: '##default'
        fundFlowCode:
          type: string
          description: 资金流水号
          default: '##default'
        orderState:
          type: string
          description: 订单状态：初始化，审批中，已拒绝，交易中，交易成功，交易失败
          enum:
            - AUDITING
            - SIGNING
            - SIGN_FAILED
            - SIGNING_REJECTED
            - TRANSITING
            - SUCCEED
            - FAILED
            - SUBMIT_FAILED
            - CONFIRMING
          x-apifox-enum:
            - value: AUDITING
              name: AUDITING
              description: AUDITING
            - value: SIGNING
              name: SIGNING
              description: AUDIT_REJECTED,
            - value: SIGN_FAILED
              name: SIGN_FAILED
              description: SIGN_FAILED
            - value: SIGNING_REJECTED
              name: SIGNING_REJECTED
              description: 签名拒绝
            - value: TRANSITING
              name: TRANSITING
              description: TRANSITING
            - value: SUCCEED
              name: SUCCEED
              description: SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: SUBMIT_FAILED
              name: SUBMIT_FAILED
              description: SUBMIT_FAILED
            - value: CONFIRMING
              name: CONFIRMING
              description: CONFIRMING
          default: '##default'
        payToList:
          type: array
          items:
            $ref: '#/components/schemas/PayTo'
            description: com.cregis.custody.common.entity.transfer.PayTo
          description: ''
        note:
          type: string
          description: 付款备注
          default: '##default'
        businessId:
          type: string
          description: 第三方业务订单ID
          default: '##default'
      x-apifox-orders:
        - ecode
        - vaultCode
        - projectId
        - cusAccountId
        - address
        - coinId
        - network
        - businessScope
        - travelRuleReferenceId
        - travelRulePayload
        - travelRuleStatus
        - travelRuleCheckStatus
        - travelRuleCheckPayload
        - kytStatus
        - kytRiskScore
        - kytPayload
        - complianceProvider
        - orderId
        - txId
        - fee
        - createTime
        - updateTime
        - id
        - taskId
        - inputAmount
        - totalAmount
        - fundFlowCode
        - orderState
        - payToList
        - note
        - businessId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryCondition

```yaml
    QueryCondition:
      type: object
      properties:
        key:
          type: string
          description: 操作符的key，如查询时的name,id之类
        value:
          type: object
          properties: {}
          description: 操作符的value，具体要查询的值，如果是字符串改成字符串即可
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        oper:
          type: string
          description: 操作符,默认是等于，冒号表示模糊匹配
        join:
          type: string
          description: 连接的方式：and或者or
      x-apifox-orders:
        - key
        - value
        - oper
        - join
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryParamProjectUnitActivity

```yaml
    QueryParamProjectUnitActivity:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryParamProjectUnitFundRecord

```yaml
    QueryParamProjectUnitFundRecord:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryParamProjectUnitLedgerFundRecord

```yaml
    QueryParamProjectUnitLedgerFundRecord:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryParamProjectUnitTransferInOrder

```yaml
    QueryParamProjectUnitTransferInOrder:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### QueryParamProjectUnitTransferOutOrder

```yaml
    QueryParamProjectUnitTransferOutOrder:
      type: object
      properties:
        pageIndex:
          type: integer
          description: 页码
        pageSize:
          type: integer
          description: 每页数量
        sortFields:
          type: string
          description: 排序字段，格式为:colume_d(倒叙)/colume_a(正序)
        queryList:
          type: array
          items:
            $ref: '#/components/schemas/QueryCondition'
            description: com.spark.support.mybatis.util.QueryCondition
          description: 查询条件
      x-apifox-orders:
        - pageIndex
        - pageSize
        - sortFields
        - queryList
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### SubmitTaskDTO

```yaml
    SubmitTaskDTO:
      type: object
      properties:
        signatures:
          $ref: '#/components/schemas/MapListString'
          description: 签名结果：key为taskId，value为签名字符串列表
          default: '##default'
        confirmed:
          type: boolean
          description: 状态:同意/拒绝
          default: false
      x-apifox-orders:
        - signatures
        - confirmed
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ThirdAddressRequest

```yaml
    ThirdAddressRequest:
      type: object
      properties:
        accountType:
          type: string
          description: 账户类型
          enum:
            - FREEZE
            - DEPOSIT
            - PRIMARY
            - RECEIVABLE
            - PAYOUT
            - PAYIN
            - GENERAL_GAS
            - QUARANTINE
            - DIRTY
          x-apifox-enum:
            - value: FREEZE
              name: FREEZE
              description: FREEZE
            - value: DEPOSIT
              name: DEPOSIT
              description: 以下是业务账户区分,不与trust Vault相关
            - value: PRIMARY
              name: PRIMARY
              description: 主账户
            - value: RECEIVABLE
              name: RECEIVABLE
              description: 入金账户 EOA
            - value: PAYOUT
              name: PAYOUT
              description: 出金账户
            - value: PAYIN
              name: PAYIN
              description: PAYIN
            - value: GENERAL_GAS
              name: GENERAL_GAS
              description: GENERAL_GAS
            - value: QUARANTINE
              name: QUARANTINE
              description: 风险隔离账户，用于承接待复核/待处置的风险资金
            - value: DIRTY
              name: DIRTY
              description: 兼容历史数据与旧实现命名，请勿在新逻辑中继续使用
          default: '##default'
        pageSize:
          type: integer
          description: 每页数量
        pageNum:
          type: integer
          description: 页码
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        unitId:
          type: integer
          description: 财务单元ID
          format: int64
      x-apifox-orders:
        - accountType
        - pageSize
        - pageNum
        - coinId
        - network
        - unitId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ThirdPayoutRequest

```yaml
    ThirdPayoutRequest:
      type: object
      properties:
        payTo:
          type: array
          items:
            $ref: '#/components/schemas/PayTo'
            description: com.cregis.custody.common.entity.transfer.PayTo
          description: 出金地址及信息列表
          default: '##default'
        from:
          type: string
          description: 出金地址
          default: '##default'
        unitId:
          type: integer
          description: 出金财务单元ID
          format: int64
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        operation:
          type: string
          description: 操作类型:withdraw/allocate/payout
          default: '##default'
        username:
          type: string
          description: 发起用户名
          default: '##default'
        userId:
          type: string
          description: 发起用户ID
          default: '##default'
        orderId:
          type: string
          description: 客户业务订单ID
          default: '##default'
        note:
          type: string
          description: 备注
          default: '##default'
        lang:
          type: string
          description: 语言
          default: '##default'
        initiator:
          type: string
          description: 任务发起人:邮箱/名称
          default: '##default'
        merchantType:
          type: string
          description: 业务类型
          enum:
            - NON_FINANCIAL_CORPORATE
            - REGULATED_VASP
            - INTERNAL_SYSTEM
          x-apifox-enum:
            - value: NON_FINANCIAL_CORPORATE
              name: NON_FINANCIAL_CORPORATE
              description: NON_FINANCIAL_CORPORATE
            - value: REGULATED_VASP
              name: REGULATED_VASP
              description: REGULATED_VASP
            - value: INTERNAL_SYSTEM
              name: INTERNAL_SYSTEM
              description: INTERNAL_SYSTEM
          default: '##default'
        travelRule:
          $ref: '#/components/schemas/TravelRuleRequest'
          description: Travel Rule信息
          default: '##default'
      x-apifox-orders:
        - payTo
        - from
        - unitId
        - coinId
        - network
        - operation
        - username
        - userId
        - orderId
        - note
        - lang
        - initiator
        - merchantType
        - travelRule
      required:
        - merchantType
        - travelRule
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### ThirdPoolingRequest

```yaml
    ThirdPoolingRequest:
      type: object
      properties:
        unitId:
          type: integer
          description: 财务单元ID
          format: int64
        amount:
          type: integer
          description: 归集门限金额
          default: '##default'
        lang:
          type: string
          description: 语言
          enum:
            - zh_CN
            - zh_TW
            - en_US
            - en_GB
            - ja_JP
            - ko_KR
            - fr_FR
            - de_DE
            - es_ES
            - it_IT
            - ru_RU
            - pt_PT
            - pt_BR
            - vi_VN
            - th_TH
            - id_ID
            - tr_TR
            - ar_SA
            - he_IL
            - nl_NL
            - pl_PL
            - sv_SE
            - fi_FI
            - da_DK
            - no_NO
            - cs_CZ
            - hu_HU
            - ro_RO
            - el_GR
            - ms_MY
            - uk_UA
          x-apifox-enum:
            - value: zh_CN
              name: zh_CN
              description: zh_CN
            - value: zh_TW
              name: zh_TW
              description: zh_TW
            - value: en_US
              name: en_US
              description: en_US
            - value: en_GB
              name: en_GB
              description: en_GB
            - value: ja_JP
              name: ja_JP
              description: ja_JP
            - value: ko_KR
              name: ko_KR
              description: ko_KR
            - value: fr_FR
              name: fr_FR
              description: fr_FR
            - value: de_DE
              name: de_DE
              description: de_DE
            - value: es_ES
              name: es_ES
              description: es_ES
            - value: it_IT
              name: it_IT
              description: it_IT
            - value: ru_RU
              name: ru_RU
              description: ru_RU
            - value: pt_PT
              name: pt_PT
              description: pt_PT
            - value: pt_BR
              name: pt_BR
              description: pt_BR
            - value: vi_VN
              name: vi_VN
              description: vi_VN
            - value: th_TH
              name: th_TH
              description: th_TH
            - value: id_ID
              name: id_ID
              description: id_ID
            - value: tr_TR
              name: tr_TR
              description: tr_TR
            - value: ar_SA
              name: ar_SA
              description: ar_SA
            - value: he_IL
              name: he_IL
              description: he_IL
            - value: nl_NL
              name: nl_NL
              description: nl_NL
            - value: pl_PL
              name: pl_PL
              description: pl_PL
            - value: sv_SE
              name: sv_SE
              description: sv_SE
            - value: fi_FI
              name: fi_FI
              description: fi_FI
            - value: da_DK
              name: da_DK
              description: da_DK
            - value: no_NO
              name: no_NO
              description: no_NO
            - value: cs_CZ
              name: cs_CZ
              description: cs_CZ
            - value: hu_HU
              name: hu_HU
              description: hu_HU
            - value: ro_RO
              name: ro_RO
              description: ro_RO
            - value: el_GR
              name: el_GR
              description: el_GR
            - value: ms_MY
              name: ms_MY
              description: ms_MY
            - value: uk_UA
              name: uk_UA
              description: uk_UA
          default: '##default'
        coinId:
          type: string
          description: 币种ID
          default: '##default'
        network:
          type: string
          description: 网络
          default: '##default'
        note:
          type: string
          description: 备注
          default: '##default'
        includes:
          type: array
          items:
            type: string
          description: 包含地址列表
          default: '##default'
        excludes:
          type: array
          items:
            type: string
          description: 排除地址列表
          default: '##default'
      x-apifox-orders:
        - unitId
        - amount
        - lang
        - coinId
        - network
        - note
        - includes
        - excludes
      required:
        - unitId
        - amount
        - coinId
        - network
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### TravelRuleRequest

```yaml
    TravelRuleRequest:
      type: object
      properties:
        referenceId:
          type: string
          description: Travel Rule 引用ID
          default: '##default'
        payload:
          type: string
          description: Travel Rule 原始数据(JSON字符串)
          default: '##default'
      x-apifox-orders:
        - referenceId
        - payload
      required:
        - referenceId
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### WCCIPCmdAuditTask

```yaml
    WCCIPCmdAuditTask:
      type: object
      properties:
        id:
          type: integer
          description: id
          format: int64
        taskId:
          type: string
          description: 任务ID
          default: '##default'
        vaultCode:
          type: string
          description: vault code
          default: '##default'
        projectId:
          type: integer
          description: ''
          format: int64
        accountId:
          type: string
          description: 金库的账户ID
          default: '##default'
        accountType:
          type: string
          description: 金库的账户类型
          enum:
            - GENERAL_ACQUIRING
            - SMART_ACQUIRING
            - SMART
            - GMA
            - TMA
            - GENERAL
          x-apifox-enum:
            - value: GENERAL_ACQUIRING
              name: GENERAL_ACQUIRING
              description: GENERAL, GAS_MANAGE, MANAGE, CA_MANAGE, CA
            - value: SMART_ACQUIRING
              name: SMART_ACQUIRING
              description: SMART_ACQUIRING
            - value: SMART
              name: SMART
              description: SMART
            - value: GMA
              name: GMA
              description: GMA
            - value: TMA
              name: TMA
              description: TMA
            - value: GENERAL
              name: GENERAL
              description: GENERAL
          default: '##default'
        submitter:
          type: string
          description: 提交人:在三方模式时是customer code/两方模式时是guard squad id
          default: '##default'
        ecode:
          type: string
          description: 企业code
          default: '##default'
        cmdType:
          type: string
          description: 命令类型
          default: '##default'
        cmdBasic: &ref_0
          $ref: '#/components/schemas/MapObject'
          description: 命令
          default: '##default'
        cmdForm: *ref_0
        businessId:
          type: string
          description: 业务id:主要是订单id
          default: '##default'
        state:
          type: string
          description: 任务状态
          enum:
            - AUDITING
            - REJECTED
            - AUDIT_REJECTED
            - AUDIT_PASSED
            - SIGNING
            - SIGN_FAILED
            - SIGN_SUCCEED
            - FAILED
            - WAITING
            - SIGN_REJECTED
            - ALL_BROADCAST_SUCCEED
            - PARTIALLY_BROADCAST_SUCCEED
            - ALL_BROADCAST_FAILED
            - BROADCAST_FAILED
            - BROADCAST_EXCEPTION
            - EXPIRED
          x-apifox-enum:
            - value: AUDITING
              name: AUDITING
              description: AUDITING
            - value: REJECTED
              name: REJECTED
              description: REJECTED
            - value: AUDIT_REJECTED
              name: AUDIT_REJECTED
              description: AUDIT_REJECTED
            - value: AUDIT_PASSED
              name: AUDIT_PASSED
              description: AUDIT_PASSED
            - value: SIGNING
              name: SIGNING
              description: SIGNING
            - value: SIGN_FAILED
              name: SIGN_FAILED
              description: SIGN_FAILED
            - value: SIGN_SUCCEED
              name: SIGN_SUCCEED
              description: SIGN_SUCCEED
            - value: FAILED
              name: FAILED
              description: FAILED
            - value: WAITING
              name: WAITING
              description: WAITING
            - value: SIGN_REJECTED
              name: SIGN_REJECTED
              description: SIGN_REJECTED
            - value: ALL_BROADCAST_SUCCEED
              name: ALL_BROADCAST_SUCCEED
              description: ALL_BROADCAST_SUCCEED
            - value: PARTIALLY_BROADCAST_SUCCEED
              name: PARTIALLY_BROADCAST_SUCCEED
              description: PARTIALLY_BROADCAST_SUCCEED
            - value: ALL_BROADCAST_FAILED
              name: ALL_BROADCAST_FAILED
              description: ALL_BROADCAST_FAILED
            - value: BROADCAST_FAILED
              name: BROADCAST_FAILED
              description: BROADCAST_FAILED
            - value: BROADCAST_EXCEPTION
              name: BROADCAST_EXCEPTION
              description: BROADCAST_EXCEPTION
            - value: EXPIRED
              name: EXPIRED
              description: 过期
          default: '##default'
        businessType:
          type: string
          description: 业务类型:SYSTEM/BTC_TRANSFER等等
          default: '##default'
        taskType:
          type: string
          description: 任务类型,用于前端判断是资金还是系统操作:orders/issues
          default: '##default'
        createTime:
          type: string
          description: 任务创建时间
          x-apifox-mock: '@datetime'
          default: '##default'
        updateTime:
          type: string
          description: 任务更新时间
          x-apifox-mock: '@datetime'
          default: '##default'
        signContent:
          type: string
          description: 签名内容
          default: '##default'
        signContentKeyMapping:
          type: string
          description: 签名内容的映射
          default: '##default'
        total:
          type: integer
          description: 总参与审批数量
        threshold:
          type: integer
          description: 门限
        signers:
          type: array
          items:
            type: string
          description: 任务参与者、审核人、审批人等
          default: '##default'
        algoType:
          type: string
          description: ''
          enum:
            - ECDSA
            - EC_SCHNORR
            - ED_DSA
            - UNASSIGNED
            - ED25519
          x-apifox-enum:
            - value: ECDSA
              name: ECDSA
              description: ECDSA
            - value: EC_SCHNORR
              name: EC_SCHNORR
              description: EC_SCHNORR
            - value: ED_DSA
              name: ED_DSA
              description: ED_DSA
            - value: UNASSIGNED
              name: UNASSIGNED
              description: UNASSIGNED
            - value: ED25519
              name: ED25519
              description: ED25519
        initiator:
          type: string
          description: 任务发起人
          default: '##default'
        taskOperation:
          type: string
          description: 任务操作,如转账,设置board等等
          enum:
            - DEPLOY_SMART_CONTRACT
            - PAYOUT
            - WITHDRAW
            - ALLOCATE
            - SET_WHITE_LIST
            - BOARD
            - FUND_FLOW
          x-apifox-enum:
            - value: DEPLOY_SMART_CONTRACT
              name: DEPLOY_SMART_CONTRACT
              description: deploy_smart_contract
            - value: PAYOUT
              name: PAYOUT
              description: payout
            - value: WITHDRAW
              name: WITHDRAW
              description: WITHDRAW
            - value: ALLOCATE
              name: ALLOCATE
              description: allocate
            - value: SET_WHITE_LIST
              name: SET_WHITE_LIST
              description: set_white_list
            - value: BOARD
              name: BOARD
              description: board
            - value: FUND_FLOW
              name: FUND_FLOW
              description: fundFlow
          default: '##default'
        signersLevel:
          type: integer
          description: ''
        coinId:
          type: string
          description: ''
        unitName:
          type: string
          description: ''
        accountName:
          type: string
          description: ''
        includes:
          type: array
          items:
            type: string
          description: ''
        sponsored:
          type: boolean
          description: ''
          default: false
        remark:
          type: string
          description: ''
      x-apifox-orders:
        - id
        - taskId
        - vaultCode
        - projectId
        - accountId
        - accountType
        - submitter
        - ecode
        - cmdType
        - cmdBasic
        - cmdForm
        - businessId
        - state
        - businessType
        - taskType
        - createTime
        - updateTime
        - signContent
        - signContentKeyMapping
        - total
        - threshold
        - signers
        - algoType
        - initiator
        - taskOperation
        - signersLevel
        - coinId
        - unitName
        - accountName
        - includes
        - sponsored
        - remark
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```

### WhiteListCreateRequest

```yaml
    WhiteListCreateRequest:
      type: object
      properties:
        network:
          type: string
          description: network
          default: '##default'
        address:
          type: string
          description: address
          default: '##default'
        alias:
          type: string
          description: alias
          default: '##default'
      x-apifox-orders:
        - network
        - address
        - alias
      required:
        - network
        - address
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
```
