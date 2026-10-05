package com.example.ntbd.livedata.appkey;

import com.example.ntbd.config.LimitsProperties;
import com.example.ntbd.livedata.LiveDataProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * The data API as exported apps call it: requests to /api/data/** with an app key (or their CORS preflights).
 * Exported apps run anywhere (a file opened from disk has the origin "null"), so any origin may call it, but
 * without cookies: the app key in the Authorization header is the only credential, so this needs no CSRF
 * protection and keeps no session. The editor calls the same endpoints with its session instead; those
 * requests (no bearer key) go through the main chain (SecurityConfig) with its CSRF and session rules.
 */
@Configuration
public class DataApiSecurityConfig {

    static boolean isAppKeyRequest(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!path.startsWith("/api/data/")) return false;
        String header = request.getHeader("Authorization");
        boolean bearer = header != null && header.startsWith("Bearer ");
        boolean preflight = HttpMethod.OPTIONS.matches(request.getMethod()) && request.getHeader("Origin") != null;
        return bearer || preflight;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain dataApiFilterChain(HttpSecurity http, AppKeyService keys, LimitsProperties limits,
                                                  LiveDataProperties properties) throws Exception {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of("*"));
        cors.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(600L);
        UrlBasedCorsConfigurationSource corsSource = new UrlBasedCorsConfigurationSource();
        corsSource.registerCorsConfiguration("/api/data/**", cors);

        http.securityMatcher(DataApiSecurityConfig::isAppKeyRequest)
                .cors(c -> c.configurationSource(corsSource))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .addFilterBefore(new AppKeyAuthenticationFilter(keys, limits, properties.requestsPerMinute()), BasicAuthenticationFilter.class)
                .headers(headers -> headers
                        .addHeaderWriter(new StaticHeadersWriter("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().hasAuthority("APP_KEY"))
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }
}
