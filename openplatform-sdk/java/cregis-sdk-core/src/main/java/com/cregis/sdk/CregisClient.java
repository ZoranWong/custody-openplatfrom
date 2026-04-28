package com.cregis.sdk;

import com.cregis.sdk.core.config.SdkConfig;
import com.cregis.sdk.core.config.SdkConfigValidator;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.http.OkHttpClientAdapter;
import com.cregis.sdk.service.OAuthService;
import com.cregis.sdk.service.PayoutService;
import com.cregis.sdk.service.TransactionService;
import com.cregis.sdk.service.TreasuryService;
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
 *   TreasuryUnitResponse unit = client.treasury().createUnit("resource-access-key", request);
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

        log.info("Cregis SDK initialized for appId={}", maskAuthorizationId(appId));
    }

    /**
     * OAuth / Authorization service.
     */
    public OAuthService oauth() {
        return oauthService;
    }

    /**
     * Treasury Unit service.
     */
    public TreasuryService treasury() {
        return treasuryService;
    }

    /**
     * Payout service.
     */
    public PayoutService payout() {
        return payoutService;
    }

    /**
     * Transaction service.
     */
    public TransactionService transaction() {
        return transactionService;
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
