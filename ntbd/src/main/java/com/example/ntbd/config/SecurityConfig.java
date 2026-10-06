package com.example.ntbd.config;

import com.example.ntbd.auth.DevSignInController;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationTrustResolver;
import org.springframework.security.authentication.AuthenticationTrustResolverImpl;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.List;

/**
 * Who may call what. Everything needs a signed-in user, except the sign-in flow itself.
 * <ul>
 *   <li>Sign-in: OIDC (Google, Microsoft) starting at /oauth2/authorization/{provider}; the
 *       AppOidcUserService bean turns the identity into our account. The session is an HttpOnly cookie.</li>
 *   <li>Not signed in: 401 (no redirect), so the editor can show its own login page.</li>
 *   <li>CSRF: the token travels in the XSRF-TOKEN cookie and comes back as the X-XSRF-TOKEN header,
 *       which Angular's HttpClient does on its own for same-origin requests.</li>
 *   <li>CORS: off, because the editor calls the API on its own origin (a proxy in front of both).
 *       {@code app.cors.allowed-origins} turns it on for exactly those origins.</li>
 *   <li>Limits: request size and rate limits ({@link RequestLimitsFilter}); every request gets an id
 *       and a log line ({@link RequestContextFilter}).</li>
 *   <li>Headers: Spring's defaults (nosniff, frame denial, no caching, HSTS over HTTPS), no referrer, and
 *       for API answers a Content-Security-Policy that allows nothing (a version's preview has its own,
 *       sandboxed: VersionControlController.PREVIEW_CSP). The editor's own CSP is the proxy's
 *       (deploy/Caddyfile).</li>
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(LimitsProperties.class)
public class SecurityConfig {

    private final LimitsProperties limits;

    public SecurityConfig(LimitsProperties limits) {
        this.limits = limits;
    }

    /** Where the editor runs; sign-in sends the browser back there. */
    @Value("${app.frontend-url}")
    private String frontendUrl;

    /** Origins allowed to call the API from another origin (empty: none). */
    @Value("${app.cors.allowed-origins:}")
    private List<String> corsAllowedOrigins;

    /** Serve the OpenAPI spec and Swagger UI without sign-in (local development only). */
    @Value("${app.security.public-api-docs:false}")
    private boolean publicApiDocs;

    /** Local development: sign in as any email at DevSignInController, without an identity provider. */
    @Value("${app.security.dev-sign-in:false}")
    private boolean devSignIn;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        List<String> origins = corsAllowedOrigins.stream().filter(o -> !o.isBlank()).toList();
        if (origins.isEmpty()) {
            http.cors(cors -> cors.disable());
        } else {
            http.cors(cors -> cors.configurationSource(corsConfigurationSource(origins)));
        }

        http.csrf(csrf -> csrf.spa())
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .addFilterAfter(new RequestContextFilter(), SecurityContextHolderFilter.class)
            .addFilterBefore(new RequestLimitsFilter(limits), OAuth2AuthorizationRequestRedirectFilter.class)
            .headers(headers -> headers
                    .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                    .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                            "camera=(), microphone=(), geolocation=(), payment=()"))
                    .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(
                            new org.springframework.security.web.util.matcher.AndRequestMatcher(
                                    PathPatternRequestMatcher.withDefaults().matcher("/api/**"),
                                    new org.springframework.security.web.util.matcher.NegatedRequestMatcher(
                                            PathPatternRequestMatcher.withDefaults().matcher(
                                                    com.example.ntbd.controller.VersionControlController.PREVIEW_PATH))),
                            new StaticHeadersWriter("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers("/oauth2/**", "/login/**", "/error", "/actuator/health").permitAll();
                if (devSignIn) {
                    auth.requestMatchers(DevSignInController.PATH).permitAll();
                }
                if (publicApiDocs) {
                    auth.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                }
                auth.anyRequest().authenticated();
            })
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                    .accessDeniedHandler(accessDenied()))
            .oauth2Login(login -> login
                    // The editor's login page (this also turns off Spring's generated one)
                    .loginPage(frontendUrl + "/login")
                    .defaultSuccessUrl(frontendUrl + "/console", true)
                    .failureHandler(signInFailed()))
            .logout(logout -> logout
                    .logoutUrl("/logout")
                    .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)));
        return http.build();
    }

    private static CorsConfigurationSource corsConfigurationSource(List<String> origins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * 403 for a signed-in user; 401 for everyone else. A write without CSRF token is denied before
     * sign-in is checked, and a client that isn't signed in should hear "sign in" first.
     */
    private static AccessDeniedHandler accessDenied() {
        AuthenticationTrustResolver trustResolver = new AuthenticationTrustResolverImpl();
        return (request, response, exception) -> {
            boolean signedIn = trustResolver.isAuthenticated(SecurityContextHolder.getContext().getAuthentication());
            response.setStatus(signedIn ? HttpStatus.FORBIDDEN.value() : HttpStatus.UNAUTHORIZED.value());
        };
    }

    /** Back to the editor's login page, with the OAuth2 error code (e.g. email_in_use) as {@code ?error=}. */
    private AuthenticationFailureHandler signInFailed() {
        return (request, response, exception) -> {
            String code = exception instanceof OAuth2AuthenticationException oauth
                    ? oauth.getError().getErrorCode()
                    : "sign_in_failed";
            response.sendRedirect(UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/login")
                    .queryParam("error", code)
                    .encode()
                    .toUriString());
        };
    }

    /**
     * Loads the CSRF token on every request, so the XSRF-TOKEN cookie is always set (Spring only
     * writes it when something reads the token) and the editor has it before its first write.
     */
    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (token != null) {
                token.getToken();
            }
            chain.doFilter(request, response);
        }
    }
}
