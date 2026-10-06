package com.example.ntbd.workflow.sidecar;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

/**
 * Talks to the flow sidecar: the Node service that runs flows with the same engine as the browser
 * (name-tbd/src/flow-engine/server). Off unless {@code app.flows.sidecar-url} is set.
 */
@Component
public class FlowSidecarClient {

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT = new ParameterizedTypeReference<>() { };

    private final String url;
    private final RestClient client;

    public FlowSidecarClient(@Value("${app.flows.sidecar-url:}") String url,
                             @Value("${app.flows.sidecar-token:}") String token) {
        this.url = url == null ? "" : url.replaceAll("/+$", "");
        SimpleClientHttpRequestFactory requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(Duration.ofSeconds(5));
        // A flow may wait for slow HTTP requests (30 s each, see the HTTP request action)
        requests.setReadTimeout(Duration.ofMinutes(2));
        RestClient.Builder builder = RestClient.builder().requestFactory(requests);
        if (token != null && !token.isBlank()) builder.defaultHeader("Authorization", "Bearer " + token);
        this.client = builder.build();
    }

    public boolean enabled() {
        return !url.isBlank();
    }

    /** Runs a flow (a RunRequest, see flow-engine/run-request.ts) and returns the sidecar's RunResponse. */
    public Map<String, Object> run(Map<String, Object> request) {
        if (!enabled()) throw new FlowSidecarUnavailableException("No flow sidecar is configured (app.flows.sidecar-url)");
        try {
            return client.post()
                    .uri(url + "/run")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(JSON_OBJECT);
        } catch (RestClientResponseException e) {
            // The sidecar says what's wrong with the flow (400, 422)
            throw new IllegalArgumentException("The flow could not run: " + e.getResponseBodyAsString(), e);
        } catch (RuntimeException e) {
            throw new FlowSidecarUnavailableException("The flow sidecar can't be reached", e);
        }
    }
}
