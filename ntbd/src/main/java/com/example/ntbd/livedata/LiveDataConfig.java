package com.example.ntbd.livedata;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(LiveDataProperties.class)
public class LiveDataConfig {

    /**
     * HTTP for connectors and OAuth: short timeouts, and redirects are never followed (a redirect could
     * lead past {@link PublicAddressGuard} to a private address). A new builder per use (prototype).
     */
    @Bean
    @Scope("prototype")
    public RestClient.Builder liveDataHttp() {
        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(http);
        requests.setReadTimeout(Duration.ofSeconds(30));
        return RestClient.builder().requestFactory(requests);
    }
}
