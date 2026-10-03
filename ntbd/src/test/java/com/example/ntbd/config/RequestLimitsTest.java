package com.example.ntbd.config;

import com.example.ntbd.auth.TestSignIn;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Request limits, request ids and security headers, with limits low enough to reach. */
@SpringBootTest(properties = {
        "app.limits.sign-in-per-minute=3",
        "app.limits.writes-per-minute=3",
        "app.limits.executions-per-minute=2",
        "app.limits.max-request-bytes=200",
        "app.limits.max-data-source-bytes=2000",
})
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class RequestLimitsTest {

    @Autowired
    private MockMvc mockMvc;

    private int statusOf(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request).andReturn().getResponse().getStatus();
    }

    private MockHttpServletRequestBuilder asUser(long userId, MockHttpServletRequestBuilder request) {
        return request.with(authentication(TestSignIn.authentication(userId))).with(csrf());
    }

    /** A change that's allowed to fail (no such branch), but counts as a change. */
    private MockHttpServletRequestBuilder createPage() {
        return post("/api/pages").contentType("application/json").content("{\"name\":\"x\",\"path\":\"/x\",\"branchId\":987654321}");
    }

    @Test
    void sign_ins_are_limited_per_address() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertThat(statusOf(get("/oauth2/authorization/google").with(r -> { r.setRemoteAddr("10.0.0.1"); return r; })))
                    .isEqualTo(302);
        }
        mockMvc.perform(get("/oauth2/authorization/google").with(r -> { r.setRemoteAddr("10.0.0.1"); return r; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", matchesPattern("\\d+")));
        // Another address isn't affected
        assertThat(statusOf(get("/oauth2/authorization/google").with(r -> { r.setRemoteAddr("10.0.0.2"); return r; })))
                .isEqualTo(302);
    }

    @Test
    void changes_are_limited_per_user() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertThat(statusOf(asUser(900_001, createPage()))).isEqualTo(404);
        }
        assertThat(statusOf(asUser(900_001, createPage()))).isEqualTo(429);
        // Another user isn't affected, and reading isn't limited
        assertThat(statusOf(asUser(900_002, createPage()))).isEqualTo(404);
        assertThat(statusOf(asUser(900_001, get("/api/export/formats")))).isEqualTo(200);
    }

    @Test
    void workflow_runs_have_their_own_tighter_limit() throws Exception {
        for (int i = 0; i < 2; i++) {
            assertThat(statusOf(asUser(900_003, post("/api/workflows/987654321/execute")))).isEqualTo(404);
        }
        assertThat(statusOf(asUser(900_003, post("/api/workflows/987654321/execute")))).isEqualTo(429);
    }

    @Test
    void request_bodies_are_limited_in_size() throws Exception {
        String big = "{\"name\":\"" + "x".repeat(300) + "\",\"path\":\"/x\",\"branchId\":987654321}";
        assertThat(statusOf(asUser(900_004, post("/api/pages").contentType("application/json").content(big)))).isEqualTo(413);

        // Data imports may be larger (a CSV file's text), up to their own limit
        String csv = "{\"branchId\":987654321,\"name\":\"x\",\"format\":\"csv\",\"content\":\"" + "a".repeat(1000) + "\"}";
        assertThat(statusOf(asUser(900_005, post("/api/data-sources").contentType("application/json").content(csv)))).isEqualTo(404);
        String tooBig = "{\"branchId\":987654321,\"name\":\"x\",\"format\":\"csv\",\"content\":\"" + "a".repeat(3000) + "\"}";
        assertThat(statusOf(asUser(900_005, post("/api/data-sources").contentType("application/json").content(tooBig)))).isEqualTo(413);
    }

    @Test
    void a_body_without_declared_length_is_refused() throws Exception {
        assertThat(statusOf(asUser(900_006, post("/api/pages").header("Transfer-Encoding", "chunked")))).isEqualTo(411);
    }

    @Test
    void every_request_gets_an_id() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(header().string("X-Request-Id", matchesPattern("[0-9a-f-]{36}")));
        mockMvc.perform(get("/api/me").header("X-Request-Id", "from-proxy-123"))
                .andExpect(header().string("X-Request-Id", "from-proxy-123"));
        mockMvc.perform(get("/api/me").header("X-Request-Id", "bad id <script>"))
                .andExpect(header().string("X-Request-Id", matchesPattern("[0-9a-f-]{36}")));
    }

    @Test
    void api_answers_carry_security_headers() throws Exception {
        mockMvc.perform(asUser(900_007, get("/api/export/formats")))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void the_health_check_needs_no_sign_in() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
}
