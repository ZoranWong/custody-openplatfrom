package com.cregis.sdk.core.error;

/**
 * Custody (/api/third-party/**) error codes, as thrown through the gateway.
 *
 * GENERATED from docs/third-party-api-error-codes.md by
 * docs/scripts/generate-error-codes.mjs — do not edit by hand.
 */
public enum CustodyErrorCodes {
    /** 归集来源账户不是 platform 创建的 acquiring 账户 */
    ONLY_ACQUIRING_ACCOUNT_ALLOWED(120042, "VALIDATION", false, "Only platform-created acquiring accounts can be used as the pooling source"),
    /** 出金账户余额不足；账户冻结行更新影响行数为 0；归集时无可用地址或预估金额不足 */
    ACCOUNT_BALANCE_NOT_ENOUGH(300004, "CAPACITY", false, "Payout account balance is insufficient (or the freeze-row update matched 0 rows; pooling found no usable address / estimated amount below the requested amount)"),
    /** `taskId` 为空、按 taskId / 主键都查不到、或任务 ecode 与当前 key 不一致 */
    TASK_NOT_FOUND(400001, "STATE", false, "taskId is empty, the task does not exist, or the task does not belong to this resource key"),
    /** 初始化 Board 时门限非法（≤0 或 > 守护人数），或 TrustVault `initBoard` 非 200 */
    INIT_BOARD_FAILED(400005, "STATE", false, "Board threshold is invalid (<= 0 or greater than the guardian count), or the TrustVault initBoard call failed"),
    /** 账户不存在或不属于当前企业：加币种引用外部账户、创建地址、出金、归集、修改资金流、修改白名单 */
    ACCOUNT_NOT_EXIST(400006, "STATE", false, "Account does not exist or does not belong to this company"),
    /** 企业已有 `AVAILABLE` 或 `PENDING` 的 Board，不允许重复初始化 */
    BOARD_EXIST(400008, "STATE", false, "The company already has an AVAILABLE or PENDING board; duplicate initialization is not allowed"),
    /** 添加用户时 ecode 与 key 所属企业不一致；地址查询的 accountType 非 PAYIN/PAYOUT/PRIMARY；出金 operation 非 payout/withdraw/allocate */
    OPERATION_NOT_SUPPORT(400011, "VALIDATION", false, "Unsupported operation (accountType not PAYIN/PAYOUT/PRIMARY, payout operation not payout/withdraw/allocate, or ecode mismatch when adding a user)"),
    /** 加币种新增网络、或按账户创建地址时，TrustVault `getAddress` 非 200 */
    CREATE_ADDRESS_FAILED(400012, "INFRA", true, "TrustVault getAddress failed while adding a network or creating an address"),
    /** 出金、提交任务的兜底 catch：任何非 `SparkException` 的异常 */
    UPDATE_ACCOUNT_FAILED(400013, "INFRA", true, "Unexpected error while creating a payout or submitting a task (catch-all)"),
    /** CRM 错误码：白名单变更时账户不属于当前 ecode / unit */
    MERCHANT_ACCOUNT_NOT_EXIST(400026, "STATE", false, "Account does not belong to the current ecode / unit when updating the whitelist"),
    /** 同账户已有 `PENDING` 的白名单变更 */
    WHITELIST_UPDATE_IN_PROGRESS(400027, "STATE", false, "A whitelist change for this account is already PENDING"),
    /** 修改 Board、资金流、白名单时企业没有 `AVAILABLE` 的 Board */
    BOARD_NOT_EXIST(400030, "STATE", false, "The company has no AVAILABLE board (required for board update, fund control and whitelist changes)"),
    /** 三方注册企业时建项目返回 null，或 `ProjectInitHandler` 创建金库失败 */
    CREATE_VAULT_FAILED(400036, "INFRA", true, "Project creation returned null or vault initialization failed during merchant registration"),
    /** unit 不存在、不属于当前企业，或不是当前开发者创建的 */
    ACCOUNT_UNIT_NOT_EXIST(400042, "STATE", false, "Treasury unit does not exist, does not belong to this company, or was not created by this developer"),
    /** 出金账户 `status = 0`（未激活） */
    ACCOUNT_GROUP_NOT_ACTIVATED(400048, "STATE", false, "Payout account is not activated (status = 0)"),
    /** 创建 unit、加币种时新网络的合约工厂部署失败 */
    CONTRACT_FACTORY_DEPLOY_FAILED(400056, "INFRA", true, "Contract factory deployment failed for the new network"),
    /** 自定义 unit 名称在企业内已存在 */
    ACCOUNT_UNIT_NAME_EXIST(400062, "STATE", false, "A custom treasury unit with this name already exists in the company"),
    /** 公钥已被其他用户占用；或同一邮箱试图更换公钥 */
    PUBLIC_KEY_EXIST(400067, "STATE", false, "Public key is already used by another user, or the same email tried to change its public key"),
    /** 初始化 Board 时 guardians 为空；加币种下发资金流任务时 TrustVault 未返回签名人 */
    SIGNER_NOT_EXIST_OR_NOT_ENOUGH(400070, "STATE", false, "No signers available (guardians list empty, or the users have no public key bound)"),
    /** 该账户正在归集中（Redis 归集锁被占用） */
    ACCOUNT_POOLING(400083, "STATE", false, "This account is already being pooled (Redis pooling lock is held)"),
    /** 密码为空、长度不足 8 位，或大小写/数字/特殊字符不足 3 类 */
    PASSWORD_FORMAT_ERROR(400099, "VALIDATION", false, "Password is empty, shorter than 8 characters, or lacks 3 of upper / lower / digit / special"),
    /** 出金 payTo 按地址聚合后总金额 ≤ 0 */
    INVALID_PAYOUT_AMOUNT(400101, "VALIDATION", false, "Aggregated payout amount is <= 0"),
    /** 归集时 TRON 能量租赁失败 */
    ENERGY_PERIOD_NOT_START(400102, "INFRA", true, "TRON energy rental failed during pooling"),
    /** `resourceAccessKey` 为空、不存在或状态非 `ACTIVE`（除注册企业外所有接口） */
    THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS(400103, "AUTH", false, "resourceAccessKey is empty, does not exist, or is not ACTIVE"),
    /** 企业 ecode 为空或企业不存在（注册企业的入驻编排链路） */
    MERCHANT_NOT_EXIST(400109, "STATE", false, "Merchant ecode is empty or the merchant does not exist"),
    /** TrustVault 初始化 unit 非 200，或返回账户数与请求不一致 */
    INIT_TREASURY_UNIT_FAILED(400112, "INFRA", true, "TrustVault treasury unit initialization failed or returned a different account count"),
    /** 已有 `PENDING` 的 Board 变更 */
    BOARD_UPDATE_IN_PROGRESS(400119, "STATE", false, "A board change is already PENDING"),
    /** 同金库账户已有 `PENDING` 的资金流变更 */
    FUNDFLOW_UPDATE_IN_PROGRESS(400120, "STATE", false, "A fund-flow change for this vault account is already PENDING"),
    /** 按 key 的企业找不到项目；出金时按 unit 找不到项目 */
    MERCHANT_PROJECT_NOT_EXIST(400127, "STATE", false, "No project found for the merchant / treasury unit"),
    /** 出金付款地址数超过网络上限（默认 150）；Travel Rule 开启时一对多付款 */
    PAY_TO_ADDRESS_EXCEED_LIMIT(400214, "VALIDATION", false, "Too many payTo addresses (network limit, default 150); one-to-many payouts are not allowed when Travel Rule is enabled"),
    /** 加币种时该币种 + 网络已存在 */
    COIN_ACCOUNT_ALREADY_EXISTS(400215, "STATE", false, "This coin + network already exists on the unit"),
    /** 加币种的新网络不在项目支持网络内 */
    NETWORK_NOT_SUPPORT(400216, "VALIDATION", false, "The new network is not supported by the project"),
    /** 三方注册企业时企业落库返回 null */
    CREATE_MERCHANT_FAILED(400438, "INFRA", true, "Merchant persistence returned null during merchant registration"),
    /** 出金来源地址为空；或地址可用额（扣除隔离资金与其他在途出金）不足以覆盖本单 */
    ADDRESS_BALANCE_NOT_ENOUGH(400440, "CAPACITY", false, "Source address is empty, or its available amount (excluding held funds and in-flight payouts) cannot cover this payout"),
    /** 出金地址锁获取失败、被其他请求持有，或 Redis 不可用（fail-closed） */
    ADDRESS_BALANCE_CHECK_FAILED(400441, "INFRA", true, "Could not acquire the payout address lock (held by another request, or Redis is unavailable)"),
    ;

    private final int code;
    private final String category;
    private final boolean retryable;
    private final String meaning;

    CustodyErrorCodes(int code, String category, boolean retryable, String meaning) {
        this.code = code;
        this.category = category;
        this.retryable = retryable;
        this.meaning = meaning;
    }

    public int getCode() {
        return code;
    }

    /** VALIDATION / AUTH / STATE / CAPACITY / INFRA */
    public String getCategory() {
        return category;
    }

    /** Whether a plain retry can help (most business errors are sticky). */
    public boolean isRetryable() {
        return retryable;
    }

    /** Human-readable meaning / trigger conditions (English). */
    public String getMeaning() {
        return meaning;
    }

    /** Returns the enum constant for a numeric code, or {@code null} if unknown. */
    public static CustodyErrorCodes fromCode(int code) {
        for (CustodyErrorCodes value : values()) {
            if (value.code == code) {
                return value;
            }
        }
        return null;
    }
}
