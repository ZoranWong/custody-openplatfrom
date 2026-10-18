package com.cregis.sdk;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.config.SdkConfigValidator;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.http.OkHttpClientAdapter;
import com.cregis.sdk.core.callback.CallbackService;
import com.cregis.sdk.core.callback.CallbackRequest;
import com.cregis.sdk.core.callback.CallbackHandler;
import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.error.SdkErrorCode;
import com.cregis.sdk.service.BoardService;
import com.cregis.sdk.service.FundControlService;
import com.cregis.sdk.service.MerchantService;
import com.cregis.sdk.service.OAuthService;
import com.cregis.sdk.service.PayoutService;
import com.cregis.sdk.service.TransactionService;
import com.cregis.sdk.service.TreasuryService;
import com.cregis.sdk.service.UserService;
import com.cregis.sdk.service.WhitelistService;
import lombok.Getter;
import lombok.ToString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cregis SDK facade - unified entry point for all API operations.
 *
 * Usage:
 * <pre>
 *   SdkConfig config = SdkConfig.builder()
 *       .appId("your-app-id")
 *       .appSecret("your-app-secret")
 *       .baseUrl("https://api.cregis.com")
 *       .build();
 *
 *   CregisClient client = new CregisClient(config);
 *   TreasuryUnitResponse unit = client.treasury().createTreasuryUnit("resource-access-key", request);
 * </pre>
 */
@Getter
@ToString(exclude = "appSecret")
public class CregisClient {

    private static final Logger log = LoggerFactory.getLogger(CregisClient.class);

    private final SdkConfig config;
    private final String appId;
    private final String appSecret;
    private final HttpClient httpClient;

    private final OAuthService oauthService;
    private final TreasuryService treasuryService;
    private final PayoutService payoutService;
    private final TransactionService transactionService;
    private final MerchantService merchantService;
    private final UserService userService;
    private final BoardService boardService;
    private final FundControlService fundControlService;
    private final WhitelistService whitelistService;
    private final CallbackService callbackService;

    /**
     * Create a new CregisClient with default OkHttp implementation.
     */
    public CregisClient(SdkConfig config) {
        this(config, null);
    }

    /**
     * Create a new CregisClient with a custom HttpClient.
     * If httpClient is null, uses OkHttpClientAdapter.
     */
    public CregisClient(SdkConfig config, HttpClient httpClient) {
        SdkConfigValidator.validate(config);

        this.config = config;
        this.appId = config.getAppId();
        this.appSecret = config.getAppSecret();
        this.httpClient = httpClient != null ? httpClient : new OkHttpClientAdapter(
                config.getConnectTimeout(),
                config.getReadTimeout(),
                50,
                300
        );

        this.oauthService = new OAuthService(config, this.httpClient);
        this.treasuryService = new TreasuryService(config, this.httpClient);
        this.payoutService = new PayoutService(config, this.httpClient);
        this.transactionService = new TransactionService(config, this.httpClient);
        this.merchantService = new MerchantService(config, this.httpClient);
        this.userService = new UserService(config, this.httpClient);
        this.boardService = new BoardService(config, this.httpClient);
        this.fundControlService = new FundControlService(config, this.httpClient);
        this.whitelistService = new WhitelistService(config, this.httpClient);
        this.callbackService = new CallbackService();

        log.info("Cregis SDK initialized for appId={}", maskAuthorizationId(appId));
    }

    /** OAuth / Authorization service. */
    public OAuthService oauth() {
        return oauthService;
    }

    /** Treasury Unit service. */
    public TreasuryService treasury() {
        return treasuryService;
    }

    /** Payout service. */
    public PayoutService payout() {
        return payoutService;
    }

    /** Transaction service. */
    public TransactionService transaction() {
        return transactionService;
    }

    /** Merchant service — enterprise registration (no resourceAccessKey needed). */
    public MerchantService merchant() {
        return merchantService;
    }

    /** User service — user management for third-party platforms. */
    public UserService user() {
        return userService;
    }

    /** Board service — guardian board (护卫队) initialization. */
    public BoardService board() {
        return boardService;
    }

    /** Fund control service — fund control rule updates. */
    public FundControlService fundControl() {
        return fundControlService;
    }

    /** Whitelist service — whitelist management. */
    public WhitelistService whitelist() {
        return whitelistService;
    }

    /** Callback service — HMAC-SHA256 signature verification for pushed callbacks. */
    public CallbackService callback() {
        return callbackService;
    }

    /**
     * Verify a callback and dispatch to the business handler.
     *
     * <p>The handler is invoked only after the signature verifies successfully.
     * If the signature is missing or invalid, a {@link CregisSdkException} with
     * {@link SdkErrorCode#WEBHOOK_VERIFY_FAILED} is thrown.
     *
     * @param request the callback request (metadata in headers, data in body)
     * @param handler the business handler invoked with the verified data
     */
    public void onCallback(CallbackRequest request, CallbackHandler handler) {
        if (request == null || request.getAppId() == null
                || request.getTimestamp() == null || request.getSignature() == null) {
            throw new CregisSdkException(
                    SdkErrorCode.WEBHOOK_VERIFY_FAILED,
                    "Missing required callback metadata (appId, timestamp, signature)"
            );
        }

        String signature = request.getSignature().replaceFirst("^sha256=", "");

        boolean valid = callbackService.verifySignature(
                appSecret,
                request.getAppId(),
                request.getEvent(),
                request.getTimestamp(),
                signature,
                request.getData()
        );

        if (!valid) {
            throw new CregisSdkException(
                    SdkErrorCode.WEBHOOK_VERIFY_FAILED,
                    "Invalid callback signature"
            );
        }

        handler.handle(request.getData());
    }

    /**
     * Mask sensitive ID for logging — show only first 8 characters.
     */
    private String maskAuthorizationId(String id) {
        if (id == null || id.length() <= 8) {
            return id;
        }
        return id.substring(0, 8) + "****";
    }
}
