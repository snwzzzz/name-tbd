package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.livedata.LiveDataProperties;
import com.example.ntbd.livedata.PublicAddressGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class RestApiConnectorTest {

    private MockRestServiceServer api;
    private RestApiConnector connector;

    private static final ConnectionRef CONNECTION = new ConnectionRef(1L, "rest",
            new Settings(Map.of("baseUrl", "https://api.example.com/v1/", "headers", Map.of("Accept-Language", "de"))),
            new Settings(Map.of("authValue", "Bearer t0ken")));

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        api = MockRestServiceServer.bindTo(builder).build();
        connector = new RestApiConnector(new PublicAddressGuard(new LiveDataProperties(null, "k1", List.of(), 5000, false, 600, 3, null)) {
            @Override
            public void requirePublicHost(String host) {
                // api.example.com stands for a public host here (no DNS in tests)
            }
        }, builder, JsonMapper.builder().build());
    }

    private static SourceRef source(Map<String, Object> settings, int maxRows) {
        return new SourceRef(1L, CONNECTION, new Settings(settings), null,
                List.of("id", "name", "amount", "paid"), maxRows);
    }

    @Test
    void reads_page_by_page_with_the_auth_header_and_says_when_there_are_more() {
        api.expect(requestTo("https://api.example.com/v1/orders?page=1&per_page=2"))
                .andExpect(header("Authorization", "Bearer t0ken"))
                .andExpect(header("Accept-Language", "de"))
                .andRespond(withSuccess("{\"data\":{\"items\":[{\"id\":1,\"name\":\"Ada\",\"amount\":750,\"paid\":true},"
                        + "{\"id\":2,\"name\":\"Bob\",\"amount\":20.5,\"paid\":false}]}}", MediaType.APPLICATION_JSON));
        api.expect(requestTo("https://api.example.com/v1/orders?page=2&per_page=2"))
                .andRespond(withSuccess("{\"data\":{\"items\":[{\"id\":3,\"name\":\"Cleo\",\"amount\":null,\"tags\":[\"x\"]}]}}",
                        MediaType.APPLICATION_JSON));

        LiveRows rows = connector.read(source(Map.of("path", "orders", "recordsPath", "data.items",
                "pagination", "page", "pageSize", 2), 100));
        assertThat(rows.rows()).containsExactly(
                new LiveRow("1", List.of("1", "Ada", "750", "true")),
                new LiveRow("2", List.of("2", "Bob", "20.5", "false")),
                new LiveRow("3", List.of("3", "Cleo", "", "")));
        assertThat(rows.truncated()).isFalse();
        api.verify();
    }

    @Test
    void follows_link_headers_on_the_same_api_only() {
        HttpHeaders next = new HttpHeaders();
        next.add(HttpHeaders.LINK, "<https://api.example.com/v1/orders?cursor=abc>; rel=\"next\"");
        api.expect(requestTo("https://api.example.com/v1/orders"))
                .andRespond(withSuccess("[{\"id\":1,\"name\":\"Ada\"}]", MediaType.APPLICATION_JSON).headers(next));
        HttpHeaders elsewhere = new HttpHeaders();
        elsewhere.add(HttpHeaders.LINK, "<https://attacker.example.net/steal>; rel=\"next\"");
        api.expect(requestTo("https://api.example.com/v1/orders?cursor=abc"))
                .andRespond(withSuccess("[{\"id\":2,\"name\":\"Bob\"}]", MediaType.APPLICATION_JSON).headers(elsewhere));

        LiveRows rows = connector.read(source(Map.of("path", "/orders", "pagination", "link"), 100));
        assertThat(rows.rows()).extracting(LiveRow::id).containsExactly("1", "2");
        api.verify();
    }

    @Test
    void writes_numbers_and_booleans_as_such_where_the_column_holds_them() {
        Map<String, Object> settings = Map.of("path", "/orders", "columnTypes", Map.of("amount", "number", "paid", "boolean"));
        api.expect(requestTo("https://api.example.com/v1/orders")).andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"name\":\"Dana\",\"amount\":12.5,\"paid\":true}", org.springframework.test.json.JsonCompareMode.STRICT))
                .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"id\":4,\"name\":\"Dana\",\"amount\":12.5,\"paid\":true}"));
        api.expect(requestTo("https://api.example.com/v1/orders/4")).andExpect(method(HttpMethod.PATCH))
                .andExpect(content().json("{\"amount\":null}", org.springframework.test.json.JsonCompareMode.STRICT))
                .andRespond(withSuccess("{\"id\":4,\"name\":\"Dana\",\"amount\":null,\"paid\":true}", MediaType.APPLICATION_JSON));
        api.expect(requestTo("https://api.example.com/v1/orders/4")).andExpect(method(HttpMethod.DELETE)).andRespond(withNoContent());
        api.expect(requestTo("https://api.example.com/v1/orders/a%2Fb")).andExpect(method(HttpMethod.DELETE))
                .andRespond(withResourceNotFound());

        LiveRow dana = connector.insert(source(settings, 100), Map.of("name", "Dana", "amount", "12.5", "paid", "true"));
        assertThat(dana).isEqualTo(new LiveRow("4", List.of("4", "Dana", "12.5", "true")));
        assertThat(connector.update(source(settings, 100), "4", Map.of("amount", "")).values()).containsExactly("4", "Dana", "", "true");
        connector.delete(source(settings, 100), List.of("4", "a/b"));
        api.verify();
    }

    @Test
    void an_api_that_only_says_where_the_new_record_is_is_asked_for_it() {
        api.expect(requestTo("https://api.example.com/v1/orders")).andExpect(method(HttpMethod.POST))
                .andRespond(withCreatedEntity(URI.create("https://api.example.com/v1/orders/9")));
        api.expect(requestTo("https://api.example.com/v1/orders/9"))
                .andRespond(withSuccess("{\"id\":9,\"name\":\"Ed\"}", MediaType.APPLICATION_JSON));
        assertThat(connector.insert(source(Map.of("path", "/orders"), 100), Map.of("name", "Ed")).id()).isEqualTo("9");
    }

    @Test
    void failures_and_redirects_become_messages_without_secrets() {
        api.expect(requestTo("https://api.example.com/v1/orders")).andRespond(withStatus(HttpStatus.FOUND)
                .location(URI.create("http://169.254.169.254/latest/meta-data")));
        assertThatThrownBy(() -> connector.read(source(Map.of("path", "/orders"), 100)))
                .isInstanceOf(ConnectorException.class).hasMessageNotContaining("t0ken");

        assertThatThrownBy(() -> new RestApiConnector(new PublicAddressGuard(new LiveDataProperties(null, "k1", List.of(), 5000, false, 600, 3, null)),
                RestClient.builder(), JsonMapper.builder().build())
                .test(new ConnectionRef(null, "rest", new Settings(Map.of("baseUrl", "http://localhost:8080")), Settings.EMPTY)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("https");
    }
}
