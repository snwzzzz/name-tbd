package com.example.ntbd.livedata.oauth;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.livedata.SecretBox;
import com.example.ntbd.livedata.connector.ConnectionRef;
import com.example.ntbd.persistence.DataConnectionRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Access tokens for OAuth connections (Google, Microsoft): traded for the connection's refresh token and
 * kept in memory until shortly before they expire. Providers that hand out a new refresh token with it
 * (Microsoft) get it stored, encrypted, in place of the old one.
 * <p>
 * A connection whose secret holds an {@code accessToken} and no refresh token uses it as is (tests, and
 * tokens made elsewhere).
 */
@Component
public class AccessTokens {

    private record Token(String value, Instant expires) {
    }

    private final OAuthProviders providers;
    private final DataConnectionRepository connections;
    private final SecretBox secrets;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;
    private final RestClient client;
    private final Cache<Long, Token> tokens = Caffeine.newBuilder().maximumSize(10_000).build();

    public AccessTokens(OAuthProviders providers, DataConnectionRepository connections, SecretBox secrets,
                        ObjectMapper objectMapper, TransactionTemplate transactions, RestClient.Builder liveDataHttp) {
        this.providers = providers;
        this.connections = connections;
        this.secrets = secrets;
        this.objectMapper = objectMapper;
        this.transactions = transactions;
        this.client = liveDataHttp.build();
    }

    public String accessToken(ConnectionRef connection) {
        String refreshToken = connection.secret().text("refreshToken");
        if (refreshToken == null) {
            String fixed = connection.secret().text("accessToken");
            if (fixed == null) throw new ConnectorException("This connection isn't signed in; connect it again");
            return fixed;
        }
        Token cached = connection.id() == null ? null : tokens.getIfPresent(connection.id());
        if (cached != null && cached.expires().isAfter(Instant.now().plusSeconds(60))) return cached.value();

        Map<String, Object> answer = trade(providers.forKind(connection.kind()), Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken));
        Token token = new Token(String.valueOf(answer.get("access_token")), expiry(answer));
        if (connection.id() != null) {
            tokens.put(connection.id(), token);
            Object rotated = answer.get("refresh_token");
            if (rotated instanceof String newToken && !newToken.equals(refreshToken)) storeRefreshToken(connection.id(), newToken);
        }
        return token.value();
    }

    /** Trades an authorization code for tokens (after the user agreed at the provider). */
    public Map<String, Object> exchangeCode(OAuthProviders.Provider provider, String code, String redirectUri) {
        return trade(provider, Map.of("grant_type", "authorization_code", "code", code, "redirect_uri", redirectUri));
    }

    /** Forgets a connection's access token (e.g. after the provider refused it). */
    public void forget(Long connectionId) {
        if (connectionId != null) tokens.invalidate(connectionId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> trade(OAuthProviders.Provider provider, Map<String, String> grant) {
        if (!provider.configured()) {
            throw new ConnectorException("Sign-in with " + provider.id() + " isn't configured on this server");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        grant.forEach(form::add);
        form.add("client_id", provider.clientId());
        form.add("client_secret", provider.clientSecret());
        try {
            Map<String, Object> answer = client.post()
                    .uri(provider.tokenUri())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (answer == null || answer.get("access_token") == null) {
                throw new ConnectorException(provider.id() + " gave no access token");
            }
            return answer;
        } catch (RestClientResponseException e) {
            throw new ConnectorException("Signing in with " + provider.id() + " failed (" + e.getStatusCode().value()
                    + "); connect the connection again", e);
        }
    }

    private static Instant expiry(Map<String, Object> answer) {
        Object seconds = answer.get("expires_in");
        long value = seconds instanceof Number n ? n.longValue() : 3600;
        return Instant.now().plus(Duration.ofSeconds(value));
    }

    @SuppressWarnings("unchecked")
    private void storeRefreshToken(Long connectionId, String refreshToken) {
        transactions.executeWithoutResult(status -> connections.findById(connectionId).ifPresent(connection -> {
            Map<String, Object> secret = connection.getSecret() == null ? new LinkedHashMap<>()
                    : new LinkedHashMap<>(objectMapper.readValue(secrets.open(connection.getSecret()), Map.class));
            secret.put("refreshToken", refreshToken);
            connection.setSecret(secrets.seal(objectMapper.writeValueAsString(secret)));
        }));
    }
}
