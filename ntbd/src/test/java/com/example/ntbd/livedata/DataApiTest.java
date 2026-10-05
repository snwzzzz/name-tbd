package com.example.ntbd.livedata;

import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.livedata.appkey.AppKeyService;
import com.example.ntbd.persistence.DataSourceRepository;
import com.example.ntbd.service.ApplicationService;
import com.example.ntbd.service.BranchService;
import com.example.ntbd.service.DataSourceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Who may use the data API: an exported app with its key (from any origin, without cookies), only for its own
 * app's data, writing only if its key and the data source allow it; the editor with its session (and CSRF).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class DataApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DataSourceService dataSources;
    @Autowired private DataSourceRepository dataSourceRepository;
    @Autowired private AppKeyService keys;
    @Autowired private ApplicationService applications;
    @Autowired private BranchService branches;

    private long contacts;
    private String key;
    private long keyId;
    private String readOnlyKey;
    private long otherAppsSource;

    @BeforeEach
    void setUp() {
        TestSignIn.signInAs(-1L);
        contacts = dataSources.importDataSource(new NewDataSourceCommand(-1L, "contacts", "csv",
                "name,email\nAda,ada@example.com\nBob,bob@example.com\nCleo,cleo@example.com")).id();
        AppKeyService.NewKey created = keys.create(-1L, "test", true);
        key = created.key();
        keyId = created.info().id();
        readOnlyKey = keys.create(-1L, "read only", false).key();

        long workspace = applications.findById(-1L).workspaceId();
        long otherApp = applications.createApplication(new NewApplicationCommand(workspace, "Other", "")).id();
        long otherBranch = branches.createBranch(new NewBranchCommand(otherApp, "main", "")).id();
        otherAppsSource = dataSources.importDataSource(new NewDataSourceCommand(otherBranch, "secret", "csv", "x\n1")).id();
        // Requests below say who they are themselves (a key, or a session)
        TestSignIn.signOut();
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    @Test
    void an_export_opened_from_disk_may_call_it_from_any_origin_without_cookies() throws Exception {
        MvcResult preflight = mockMvc.perform(options("/api/data/" + contacts + "/rows")
                .header("Origin", "null")
                .header("Access-Control-Request-Method", "PATCH")
                .header("Access-Control-Request-Headers", "authorization,content-type")).andReturn();
        assertThat(preflight.getResponse().getStatus()).isEqualTo(200);
        assertThat(preflight.getResponse().getHeader("Access-Control-Allow-Origin")).isEqualTo("*");
        assertThat(preflight.getResponse().getHeader("Access-Control-Allow-Credentials")).isNull();

        // No CSRF token and no session: the key is the only credential
        MvcResult read = mockMvc.perform(withKey(get("/api/data/" + contacts), key).header("Origin", "null")).andReturn();
        assertThat(read.getResponse().getStatus()).isEqualTo(200);
        assertThat(read.getResponse().getHeader("Set-Cookie")).isNull();
        JsonNode page = json(read);
        assertThat(page.get("columns").toString()).isEqualTo("[\"name\",\"email\"]");
        assertThat(page.get("rows").size()).isEqualTo(3);
    }

    @Test
    void unknown_and_revoked_keys_are_turned_away() throws Exception {
        assertThat(status(withKey(get("/api/data/" + contacts), "ntbd_ak_not-a-real-key"))).isEqualTo(401);
        assertThat(status(get("/api/data/" + contacts).header("Origin", "null"))).isEqualTo(401);

        keys.revoke(keyId);
        assertThat(status(withKey(get("/api/data/" + contacts), key))).isEqualTo(401);
    }

    @Test
    void a_key_opens_only_its_own_apps_data() throws Exception {
        assertThat(status(withKey(get("/api/data/" + otherAppsSource), key))).isEqualTo(404);
        assertThat(status(withKey(post("/api/data/" + otherAppsSource + "/rows/delete"), key)
                .contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[]}"))).isEqualTo(404);
    }

    @Test
    void a_read_only_key_or_source_can_not_change_rows() throws Exception {
        assertThat(status(withKey(get("/api/data/" + contacts), readOnlyKey))).isEqualTo(200);
        assertThat(status(addDana(readOnlyKey))).isEqualTo(403);

        DataSource source = dataSourceRepository.findById(new DataSource.DataSourceId(contacts)).orElseThrow();
        source.setReadOnly(true);
        dataSourceRepository.saveAndFlush(source);
        assertThat(status(addDana(key))).isEqualTo(403);
    }

    @Test
    void rows_are_changed_by_id_so_deleting_one_does_not_shift_the_others() throws Exception {
        JsonNode rows = json(mockMvc.perform(withKey(get("/api/data/" + contacts), key)).andReturn()).get("rows");
        String ada = rows.get(0).get("id").asString();
        String cleo = rows.get(2).get("id").asString();

        assertThat(status(withKey(post("/api/data/" + contacts + "/rows/delete"), key)
                .contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[\"" + ada + "\"]}"))).isEqualTo(204);
        // Cleo is still Cleo, though she's now second
        JsonNode changed = json(mockMvc.perform(withKey(patch("/api/data/" + contacts + "/rows"), key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"" + cleo + "\",\"values\":{\"email\":\"cleo@new.example.com\"}}")).andReturn());
        assertThat(changed.get("row").get("values").toString()).isEqualTo("[\"Cleo\",\"cleo@new.example.com\"]");

        assertThat(status(addDana(key))).isEqualTo(201);
        assertThat(dataSources.findById(contacts).rows()).containsExactly(
                List.of("Bob", "bob@example.com"), List.of("Cleo", "cleo@new.example.com"), List.of("Dana", ""));
        // A column the source doesn't have is refused
        assertThat(status(withKey(post("/api/data/" + contacts + "/rows"), key).contentType(MediaType.APPLICATION_JSON)
                .content("{\"values\":{\"salary\":\"1\"}}"))).isEqualTo(400);
    }

    @Test
    void the_editor_uses_its_session_and_needs_its_csrf_token_to_write() throws Exception {
        MockHttpServletRequestBuilder add = post("/api/data/" + contacts + "/rows").contentType(MediaType.APPLICATION_JSON)
                .content("{\"values\":{\"name\":\"Eve\"}}").with(authentication(TestSignIn.authentication(-1L)));
        assertThat(status(add)).isEqualTo(403);
        assertThat(status(add.with(csrf()))).isEqualTo(201);
        assertThat(status(get("/api/data/" + contacts).with(authentication(TestSignIn.authentication(-1L))))).isEqualTo(200);
    }

    private MockHttpServletRequestBuilder addDana(String withKey) {
        return withKey(post("/api/data/" + contacts + "/rows"), withKey)
                .contentType(MediaType.APPLICATION_JSON).content("{\"values\":{\"name\":\"Dana\"}}");
    }

    private static MockHttpServletRequestBuilder withKey(MockHttpServletRequestBuilder request, String key) {
        return request.header("Authorization", "Bearer " + key);
    }

    private int status(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request).andReturn().getResponse().getStatus();
    }

    private JsonNode json(MvcResult result) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isLessThan(300);
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
