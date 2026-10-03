package com.example.ntbd.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Configuration
public class SecurityConfig {

    /** Where the editor runs; sign-in sends the browser back there. */
    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Sign-in with OIDC (Google, Microsoft): /oauth2/authorization/{provider} starts it; the
     * AppOidcUserService bean turns the identity into our account. Requests aren't restricted yet.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .oauth2Login(login -> login
                    .defaultSuccessUrl(frontendUrl + "/console", true)
                    .failureHandler(signInFailed()))
            .logout(logout -> logout
                    .logoutUrl("/logout")
                    .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)));
        return http.build();
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
}
