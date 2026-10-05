package com.example.ntbd.livedata;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

/**
 * Live data settings ({@code app.data.*}).
 *
 * @param encryptionKey       base64 of 32 random bytes; encrypts connections' credentials (env DATA_ENCRYPTION_KEY).
 *                            Without one, connections with credentials can't be saved or used.
 * @param encryptionKeyId     names the key in what it encrypted, so it can be rotated
 * @param oldEncryptionKeys   earlier keys as {@code id:base64}, still read (never written) after a rotation
 * @param maxRows             most rows a live data source answers with (the rest is left out, and said so)
 * @param allowPrivateHosts   whether connections may reach private, loopback and link-local addresses
 *                            (local development and tests; never on a server others use)
 * @param requestsPerMinute   data API requests per app key (exported apps)
 * @param readCacheSeconds    how long a live source's rows are reused before asking its system again
 *                            (protects spreadsheets and APIs with request quotas); changes clear it
 * @param publicUrl           where exported apps reach this server's API (default: app.frontend-url)
 */
@ConfigurationProperties("app.data")
public record LiveDataProperties(
        String encryptionKey,
        @DefaultValue("k1") String encryptionKeyId,
        @DefaultValue List<String> oldEncryptionKeys,
        @DefaultValue("5000") int maxRows,
        @DefaultValue("false") boolean allowPrivateHosts,
        @DefaultValue("600") int requestsPerMinute,
        @DefaultValue("3") int readCacheSeconds,
        String publicUrl
) {
}
