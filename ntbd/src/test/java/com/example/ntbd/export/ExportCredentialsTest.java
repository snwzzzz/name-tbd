package com.example.ntbd.export;

import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.DataConnection;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.livedata.SecretBox;
import com.example.ntbd.livedata.connector.*;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.DataConnectionRepository;
import com.example.ntbd.persistence.DataSourceRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import com.example.ntbd.service.ApplicationService;
import com.example.ntbd.service.BranchService;
import com.example.ntbd.service.DataSourceService;
import com.example.ntbd.service.PageService;
import com.example.ntbd.service.UiComponentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * The phase's second exit criterion: credentials never appear in an exported file. An app with a data source on
 * every kind of connection, each connection's secret a unique marker, is exported in every data mode; neither
 * the markers nor their encrypted form, nor any field that holds secrets, may be in the file. The editor's API
 * never answers them either.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(ExportCredentialsTest.FakeConnectorConfig.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class ExportCredentialsTest {

    private static final String MARKER = "CREDENTIAL-MARKER-" + UUID.randomUUID();
    private static final Set<String> SECRET_FIELDS = Set.of("secret", "password", "refreshToken", "accessToken", "authValue",
            "clientSecret", "client_secret");

    /** Rows for "fake" connections, so data embedded from a live source can be exported without a network. */
    @TestConfiguration
    static class FakeConnectorConfig {
        @Bean
        DataConnector fakeConnector() {
            return new DataConnector() {
                public Set<String> kinds() { return Set.of("fake"); }
                public void test(ConnectionRef connection) { }
                public SourceSchema describe(SourceRef source) { return new SourceSchema(List.of(ColumnInfo.text("id"), ColumnInfo.text("name")), "id"); }
                public LiveRows read(SourceRef source) {
                    // Proof that it got its secret, without passing it on
                    assertThat(source.connection().secret().text("password")).startsWith(MARKER);
                    return new LiveRows(List.of("id", "name"), List.of(new LiveRow("1", List.of("1", "Ada"))), false);
                }
                public LiveRow insert(SourceRef source, Map<String, String> values) { throw new UnsupportedOperationException(); }
                public LiveRow update(SourceRef source, String rowId, Map<String, String> values) { throw new UnsupportedOperationException(); }
                public void delete(SourceRef source, List<String> rowIds) { }
            };
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private SecretBox secrets;
    @Autowired private ApplicationService applications;
    @Autowired private BranchService branches;
    @Autowired private PageService pages;
    @Autowired private UiComponentService components;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private WorkspaceRepository workspaces;
    @Autowired private BranchRepository branchRepository;
    @Autowired private DataConnectionRepository connections;
    @Autowired private DataSourceRepository dataSources;

    private long branch;
    private final List<String> sealed = new ArrayList<>();

    @BeforeEach
    void anAppOnEveryKindOfConnection() {
        TestSignIn.signInAs(-1L);
        long workspaceId = applications.findById(-1L).workspaceId();
        long app = applications.createApplication(new NewApplicationCommand(workspaceId, "Secrets", "")).id();
        branch = branches.createBranch(new NewBranchCommand(app, "main", "")).id();
        long page = pages.createPage(new NewPageCommand("Home", "/", branch)).id();
        dataSourceService.importDataSource(new NewDataSourceCommand(branch, "local", "csv", "name\nAda"));

        Workspace workspace = workspaces.findById(new Workspace.WorkspaceId(workspaceId)).orElseThrow();
        Branch target = branchRepository.findById(new Branch.BranchId(branch)).orElseThrow();
        Map<String, Map<String, Object>> secretsByKind = Map.of(
                "postgres", Map.of("password", MARKER + "-pg"),
                "mysql", Map.of("password", MARKER + "-my"),
                "rest", Map.of("authValue", "Bearer " + MARKER + "-rest"),
                "gsheets", Map.of("refreshToken", MARKER + "-google"),
                "msgraph", Map.of("refreshToken", MARKER + "-ms"),
                "fake", Map.of("password", MARKER + "-fake"));
        secretsByKind.forEach((kind, secret) -> {
            String box = secrets.seal(objectMapper.writeValueAsString(secret));
            sealed.add(box.substring(box.indexOf(':') + 1));
            DataConnection connection = connections.save(DataConnection.builder().workspace(workspace).name(kind).kind(kind)
                    .settings("{\"host\":\"db.example.com\",\"user\":\"app\",\"baseUrl\":\"https://api.example.com\"}")
                    .secret(box).build());
            DataSource source = DataSource.builder().name("orders_" + kind).format(kind).kind(kind).connection(connection)
                    .branch(target).settings("{\"table\":\"orders\"}").keyColumn("id").build();
            source.getColumns().add(DataSourceColumn.builder().dataSource(source).columnIndex(0).name("id").build());
            source.getColumns().add(DataSourceColumn.builder().dataSource(source).columnIndex(1).name("name").build());
            long id = dataSources.saveAndFlush(source).getId().id();
            // Every source shown, so its columns are in use
            components.createComponent(new NewUiComponentCommand(page, "table",
                    Map.of("dataSourceId", String.valueOf(id), "columns", "[]"), null, null, 0.0, 0.0, 4.0, 4.0));
        });
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    @ParameterizedTest
    @ValueSource(strings = {"live", "live_cached"})
    void live_exports_carry_an_app_key_but_no_credentials(String dataMode) throws Exception {
        String html = export(dataMode);
        assertNoCredentials(html);
        assertThat(html).contains("\"liveData\"").containsPattern("\"key\":\"ntbd_ak_");
    }

    @Test
    void embedded_exports_carry_rows_but_no_credentials() throws Exception {
        // Embedding reads live sources now; only the fake one can be reached without a network
        dataSources.findAll().stream()
                .filter(s -> s.getBranch().getId().id() == branch && !s.isEmbedded() && !s.getKind().equals("fake"))
                .forEach(dataSources::delete);
        dataSources.flush();

        String html = export("embed");
        assertNoCredentials(html);
        assertThat(html).contains("\"orders_fake\"").contains("\"Ada\"").doesNotContain("\"liveData\"");
    }

    @Test
    void the_editors_api_never_answers_secrets() throws Exception {
        long workspaceId = applications.findById(-1L).workspaceId();
        MvcResult listed = mockMvc.perform(get("/api/connections").param("workspaceId", String.valueOf(workspaceId))
                .with(authentication(TestSignIn.authentication(-1L)))).andReturn();
        assertThat(listed.getResponse().getStatus()).isEqualTo(200);
        assertNoCredentials(listed.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertThat(listed.getResponse().getContentAsString()).contains("\"hasSecret\":true");
    }

    private String export(String dataMode) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/branches/" + branch + "/export").param("dataMode", dataMode)
                .with(authentication(TestSignIn.authentication(-1L)))).andReturn();
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(200);
        return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private void assertNoCredentials(String text) {
        assertThat(text).doesNotContain(MARKER);
        sealed.forEach(box -> assertThat(text).doesNotContain(box));
        for (String field : SECRET_FIELDS) {
            Matcher m = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:").matcher(text);
            assertThat(m.find()).as("a \"" + field + "\" field").isFalse();
        }
    }
}
