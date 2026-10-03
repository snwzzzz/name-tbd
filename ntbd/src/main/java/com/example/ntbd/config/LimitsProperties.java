package com.example.ntbd.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * How much a client may send ({@code app.limits.*}; see RequestLimitsFilter).
 *
 * @param signInPerMinute    sign-in attempts per IP address (OIDC and the dev sign-in)
 * @param writesPerMinute    changes (POST, PUT, PATCH, DELETE on /api) per user, or per IP address when not signed in
 * @param executionsPerMinute workflow runs on the server per user (they call webhooks and send email)
 * @param maxRequestBytes    largest request body on /api
 * @param maxDataSourceBytes largest request body when importing a data source (a CSV file's text)
 */
@ConfigurationProperties("app.limits")
public record LimitsProperties(
        @DefaultValue("20") int signInPerMinute,
        @DefaultValue("120") int writesPerMinute,
        @DefaultValue("10") int executionsPerMinute,
        @DefaultValue("1048576") long maxRequestBytes,
        @DefaultValue("10485760") long maxDataSourceBytes
) {
}
