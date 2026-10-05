package com.example.ntbd.livedata.oauth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * The OAuth apps that connections to Google Sheets and Microsoft 365 sign in with: the same client ids as
 * sign-in (GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID), asking for more scopes and for offline access (a refresh
 * token, stored encrypted with the connection). Their consoles need one more redirect URI each:
 * {@code <APP_FRONTEND_URL>/api/connections/oauth/<google|microsoft>/callback}.
 * <p>
 * Endpoints can be overridden ({@code app.data.oauth.*}) so tests can stand in for the providers.
 */
@Component
public class OAuthProviders {

    /** A provider: where to send the user, where to trade codes and refresh tokens, and for which kind of connection. */
    public record Provider(String id, String connectionKind, String clientId, String clientSecret, String authorizationUri,
                           String tokenUri, String scopes, Map<String, String> extraParams) {
        public boolean configured() {
            return clientId != null && !clientId.isBlank() && !clientId.equals("not-configured");
        }
    }

    private final Map<String, Provider> providers;

    public OAuthProviders(
            @Value("${spring.security.oauth2.client.registration.google.client-id:}") String googleId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret:}") String googleSecret,
            @Value("${app.data.oauth.google.authorization-uri:https://accounts.google.com/o/oauth2/v2/auth}") String googleAuth,
            @Value("${app.data.oauth.google.token-uri:https://oauth2.googleapis.com/token}") String googleToken,
            @Value("${spring.security.oauth2.client.registration.microsoft.client-id:}") String microsoftId,
            @Value("${spring.security.oauth2.client.registration.microsoft.client-secret:}") String microsoftSecret,
            @Value("${MICROSOFT_TENANT:common}") String tenant,
            @Value("${app.data.oauth.microsoft.authorization-uri:}") String microsoftAuth,
            @Value("${app.data.oauth.microsoft.token-uri:}") String microsoftToken) {
        String msBase = "https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/";
        this.providers = Map.of(
                "google", new Provider("google", "gsheets", googleId, googleSecret, googleAuth, googleToken,
                        // Sheets only (not all of Drive); "spreadsheets" is a sensitive scope: Google verifies the app
                        // before people outside its test users can grant it
                        "openid email https://www.googleapis.com/auth/spreadsheets",
                        Map.of("access_type", "offline", "prompt", "consent", "include_granted_scopes", "true")),
                "microsoft", new Provider("microsoft", "msgraph", microsoftId, microsoftSecret,
                        microsoftAuth.isBlank() ? msBase + "authorize" : microsoftAuth,
                        microsoftToken.isBlank() ? msBase + "token" : microsoftToken,
                        // Sites.ReadWrite.All needs an administrator's consent in many organizations
                        "openid email offline_access User.Read Files.ReadWrite.All Sites.ReadWrite.All",
                        Map.of("prompt", "select_account")));
    }

    public Provider get(String id) {
        Provider provider = providers.get(id);
        if (provider == null) throw new IllegalArgumentException("Unknown sign-in provider: " + id);
        return provider;
    }

    /** The provider a kind of connection signs in with. */
    public Provider forKind(String connectionKind) {
        return providers.values().stream().filter(p -> p.connectionKind().equals(connectionKind)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Connections of kind " + connectionKind + " don't sign in with OAuth"));
    }
}
