package com.example.ntbd.config;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Its own context (a property no other test sets): other tests' csrf() leaves a CSRF repository
// behind in their context that doesn't write the cookie
@SpringBootTest(properties = "spring.application.name=ntbd-security-config-test")
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    /** Every API route there is, as method + path with its path variables filled in. */
    private List<Route> apiRoutes() {
        List<Route> routes = new ArrayList<>();
        for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            for (String pattern : info.getPatternValues()) {
                // The dev sign-in is open on purpose, and only exists in development (DevSignInControllerTest)
                if (!pattern.startsWith("/api/") || pattern.startsWith("/api/dev/")) continue;
                String path = pattern.replaceAll("\\{[^}]+}", "1");
                if (methods.isEmpty()) {
                    routes.add(new Route(HttpMethod.GET, path));
                } else {
                    methods.forEach(m -> routes.add(new Route(HttpMethod.valueOf(m.name()), path)));
                }
            }
        }
        return routes;
    }

    private record Route(HttpMethod method, String path) {}

    @Test
    void every_api_route_answers_401_without_sign_in() throws Exception {
        List<Route> routes = apiRoutes();
        assertThat(routes).hasSizeGreaterThan(30);

        List<String> notProtected = new ArrayList<>();
        for (Route route : routes) {
            // With and without a CSRF token: neither may get past the sign-in check
            int plain = mockMvc.perform(request(route.method(), route.path())).andReturn().getResponse().getStatus();
            int withToken = mockMvc.perform(request(route.method(), route.path()).with(csrf())).andReturn().getResponse().getStatus();
            if (plain != 401 || withToken != 401) {
                notProtected.add(route.method() + " " + route.path() + " -> " + plain + "/" + withToken);
            }
        }
        assertThat(notProtected).isEmpty();
    }

    @Test
    @WithMockUser
    void a_signed_in_write_without_csrf_token_is_forbidden() throws Exception {
        mockMvc.perform(post("/api/applications").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    /**
     * Runs first: the test helper csrf() swaps the CSRF token repository in the context for one
     * that doesn't write the cookie, so after any request with csrf() the cookie wouldn't show.
     */
    @Test
    @Order(1)
    @WithMockUser
    void a_signed_in_read_gets_through_and_sets_the_csrf_cookie() throws Exception {
        mockMvc.perform(get("/api/export/formats"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
    }

    @Test
    void sign_in_starts_at_the_identity_provider() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/google"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("https://accounts.google.com/")));
    }

    @Test
    @WithMockUser
    void cross_origin_requests_get_no_cors_headers() throws Exception {
        mockMvc.perform(get("/api/export/formats").header("Origin", "https://evil.example"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @WithMockUser
    void logout_answers_204() throws Exception {
        mockMvc.perform(post("/logout").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
