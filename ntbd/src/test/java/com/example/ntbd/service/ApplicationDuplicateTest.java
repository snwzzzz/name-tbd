package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.User;
import com.example.ntbd.dto.*;
import com.example.ntbd.persistence.VersionControlRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Duplicating an application copies its default branch, and every id stored inside the copy (widget
 * parents and workflows, page/data source props, ids in workflow nodes) points to the copy's things.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class ApplicationDuplicateTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private VersionControlService versionControlService;
    @Autowired private VersionControlRepository versionRepository;

    private User user;
    private ApplicationDto source;

    @BeforeEach
    void buildAnApplication() {
        String id = "dup-" + UUID.randomUUID().toString().substring(0, 8);
        user = accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Test", null, null));
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
        TestSignIn.signInAs(user.getId().id());

        source = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Shop", "Sells things"));
        long branch = source.defaultBranchId();
        long people = dataSourceService.importDataSource(
                new NewDataSourceCommand(branch, "People", "csv", "name,city\nAda,Bern\nBob,Basel")).id();

        long home = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
        long detailPage = pageService.createPage(new NewPageCommand("Detail", "/detail", branch)).id();
        long layout = pageService.createPage(new NewPageCommand("Layout", "/layout", branch, true)).id();

        widget(layout, "nav", Map.of("pages", "[%d,%d]".formatted(home, detailPage)), null, null);
        widget(home, "link", Map.of("text", "More", "pageId", String.valueOf(detailPage)), null, null);
        widget(home, "link", Map.of("text", "Broken", "pageId", "999999999"), null, null);
        long box = widget(home, "container", Map.of(), null, null);
        long label = widget(home, "label", Map.of("text", "Hi"), null, box);
        long table = widget(home, "table", Map.of("dataSourceId", String.valueOf(people), "columns", "[\"name\"]"), null, null);
        long input = widget(home, "input", Map.of(), null, null);
        long workflow = workflowService.findOrCreateForPage(home).id();
        long button = widget(home, "button", Map.of("text", "Go"), workflow, null);
        long detail = widget(detailPage, "detail", Map.of("dataSourceId", String.valueOf(people)), null, null);

        long trigger = node(workflow, "Trigger", Map.of("triggerType", "element_click", "elementId", String.valueOf(button)));
        long setText = node(workflow, "Action", Map.of("actionType", "set_text",
                "config", Map.of("targetId", String.valueOf(label), "text", "Bye")));
        long showDetail = node(workflow, "Action", Map.of("actionType", "show_detail", "config", Map.of(
                "tableId", String.valueOf(table), "detailId", String.valueOf(detail), "detailPageId", String.valueOf(detailPage))));
        long search = node(workflow, "Action", Map.of("actionType", "search",
                "config", Map.of("inputId", String.valueOf(input), "tableId", "all")));
        edgeService.createEdge(workflow, new NewEdgeCommand(trigger, setText, "out"));
        edgeService.createEdge(workflow, new NewEdgeCommand(setText, showDetail, "out"));
        edgeService.createEdge(workflow, new NewEdgeCommand(showDetail, search, "out"));

        versionControlService.createVersion(new NewVersionControlCommand(null, branch, null, "{}", "1.0.0"));
        TestSignIn.signOut();
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    private long widget(long page, String type, Map<String, Object> props, Long workflow, Long parent) {
        return uiComponentService.createComponent(
                new NewUiComponentCommand(page, type, props, workflow, parent, 0.0, 0.0, 2.0, 1.0)).id();
    }

    private long node(long workflow, String type, Map<String, Object> props) {
        return nodeService.createNode(new NewNodeCommand(workflow, type, props, 0.0, 0.0)).id();
    }

    private String call(MockHttpServletRequestBuilder request, int expectedStatus) throws Exception {
        return mockMvc.perform(request.with(authentication(TestSignIn.authentication(user.getId().id()))).with(csrf()))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString();
    }

    private ApplicationDto duplicate() throws Exception {
        return objectMapper.readValue(call(post("/api/applications/%d/duplicate".formatted(source.id())), 201), ApplicationDto.class);
    }

    /** What's in a branch, read back through the services. */
    private record Content(Map<String, PageDto> pages, List<UiComponentDto> widgets, List<NodeDto> nodes,
                           List<EdgeDto> edges, List<DataSourceDto> dataSources, Long workflowId) {

        UiComponentDto widget(Predicate<UiComponentDto> match) {
            return widgets.stream().filter(match).findFirst().orElseThrow();
        }

        UiComponentDto widget(String type) {
            return widget(w -> w.type().equals(type));
        }

        NodeDto action(String actionType) {
            return nodes.stream().filter(n -> actionType.equals(n.props().get("actionType"))).findFirst().orElseThrow();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> config(String actionType) {
            return (Map<String, Object>) action(actionType).props().get("config");
        }

        String id(String pageName) {
            return String.valueOf(pages.get(pageName).id());
        }
    }

    private Content contentOf(long branchId) {
        TestSignIn.signInAs(user.getId().id());
        try {
            Map<String, PageDto> pages = new TreeMap<>();
            List<UiComponentDto> widgets = new ArrayList<>();
            for (PageDto page : pageService.findByBranchId(branchId)) {
                pages.put(page.name(), page);
                widgets.addAll(uiComponentService.findByPageId(page.id()));
            }
            Long workflowId = workflowService.findForPage(pages.get("Home").id()).map(WorkflowDto::id).orElseThrow();
            List<DataSourceDto> dataSources = dataSourceService.findByBranchId(branchId).stream()
                    .map(summary -> dataSourceService.findById(summary.id())).toList();
            return new Content(pages, widgets, nodeService.findByWorkflowId(workflowId),
                    edgeService.findByWorkflowId(workflowId), dataSources, workflowId);
        } finally {
            TestSignIn.signOut();
        }
    }

    @Test
    void the_copy_has_the_same_pages_widgets_workflow_and_data_with_new_ids() throws Exception {
        ApplicationDto copy = duplicate();
        Content original = contentOf(source.defaultBranchId());
        Content copied = contentOf(copy.defaultBranchId());

        assertThat(copy.title()).isEqualTo("Shop (copy)");
        assertThat(copy.description()).isEqualTo("Sells things");
        assertThat(copy.workspaceId()).isEqualTo(source.workspaceId());
        assertThat(copy.id()).isNotEqualTo(source.id());

        assertThat(copied.pages().keySet()).containsExactly("Detail", "Home", "Layout");
        assertThat(copied.pages().get("Layout").layout()).isTrue();
        assertThat(copied.pages().get("Detail").path()).isEqualTo("/detail");
        assertThat(copied.widgets()).hasSameSizeAs(original.widgets());
        assertThat(copied.nodes()).hasSameSizeAs(original.nodes());
        assertThat(copied.edges()).hasSameSizeAs(original.edges());

        Set<Long> originalIds = new HashSet<>();
        original.widgets().forEach(w -> originalIds.add(w.id()));
        assertThat(copied.widgets()).noneMatch(w -> originalIds.contains(w.id()));

        DataSourceDto people = copied.dataSources().getFirst();
        assertThat(people.id()).isNotEqualTo(original.dataSources().getFirst().id());
        assertThat(people.columns()).containsExactly("name", "city");
        assertThat(people.rows()).containsExactly(List.of("Ada", "Bern"), List.of("Bob", "Basel"));
    }

    @Test
    void every_id_inside_the_copy_points_to_the_copy() throws Exception {
        ApplicationDto copy = duplicate();
        Content c = contentOf(copy.defaultBranchId());
        String people = String.valueOf(c.dataSources().getFirst().id());

        // Widget props by prop type: page, pages, dataSource
        assertThat(c.widget("nav").props().get("pages").toString())
                .isEqualTo("[%s,%s]".formatted(c.id("Home"), c.id("Detail")));
        assertThat(c.widget(w -> "More".equals(w.props().get("text"))).props().get("pageId")).isEqualTo(c.id("Detail"));
        assertThat(c.widget("table").props().get("dataSourceId")).isEqualTo(people);
        assertThat(c.widget("table").props().get("columns")).isEqualTo("[\"name\"]");
        assertThat(c.widget("detail").props().get("dataSourceId")).isEqualTo(people);
        // A page id that pointed to nothing is cleared, not kept
        assertThat(c.widget(w -> "Broken".equals(w.props().get("text"))).props().get("pageId")).isEqualTo("");

        // Widget columns: parent and workflow
        assertThat(c.widget("label").parentId()).isEqualTo(c.widget("container").id());
        assertThat(c.widget("button").workflowId()).isEqualTo(c.workflowId());

        // Node props: widget and page ids, at the top level (triggers) and in config (actions)
        NodeDto trigger = c.nodes().stream().filter(n -> n.type().equals("Trigger")).findFirst().orElseThrow();
        assertThat(trigger.props().get("elementId")).isEqualTo(String.valueOf(c.widget("button").id()));
        assertThat(c.config("set_text").get("targetId")).isEqualTo(String.valueOf(c.widget("label").id()));
        assertThat(c.config("set_text").get("text")).isEqualTo("Bye");
        assertThat(c.config("show_detail").get("tableId")).isEqualTo(String.valueOf(c.widget("table").id()));
        assertThat(c.config("show_detail").get("detailId")).isEqualTo(String.valueOf(c.widget("detail").id()));
        assertThat(c.config("show_detail").get("detailPageId")).isEqualTo(c.id("Detail"));
        assertThat(c.config("search").get("inputId")).isEqualTo(String.valueOf(c.widget("input").id()));
        assertThat(c.config("search").get("tableId")).isEqualTo("all");

        // Edges: the same chain, between the copy's nodes
        Map<Long, String> roleOf = new HashMap<>();
        c.nodes().forEach(n -> roleOf.put(n.id(), n.type().equals("Trigger") ? "trigger" : (String) n.props().get("actionType")));
        assertThat(c.edges().stream().map(e -> roleOf.get(e.sourceNodeId()) + "->" + roleOf.get(e.targetNodeId())))
                .containsExactlyInAnyOrder("trigger->set_text", "set_text->show_detail", "show_detail->search");
    }

    @Test
    void the_copy_starts_without_version_history() throws Exception {
        ApplicationDto copy = duplicate();
        assertThat(versionRepository.findVersionControlByBranchOrderByCreatedAt(
                new com.example.ntbd.domain.Branch.BranchId(copy.defaultBranchId()), Pageable.unpaged())).isEmpty();
    }

    @Test
    void the_copy_stands_on_its_own() throws Exception {
        ApplicationDto copy = duplicate();

        call(delete("/api/applications/" + source.id()), 204);

        String html = call(get("/api/branches/%d/export".formatted(copy.defaultBranchId())), 200);
        assertThat(html).contains("<html");
        assertThat(contentOf(copy.defaultBranchId()).widgets()).hasSize(9);
    }

    @Test
    void the_copy_can_have_its_own_title() throws Exception {
        String body = call(post("/api/applications/%d/duplicate".formatted(source.id()))
                .contentType("application/json").content("{\"title\":\"Shop 2\"}"), 201);
        assertThat(objectMapper.readValue(body, ApplicationDto.class).title()).isEqualTo("Shop 2");
    }

    @Test
    void copy_titles_stay_within_the_length_limit() {
        assertThat(ApplicationService.copyTitle("x".repeat(255))).hasSize(255).endsWith(" (copy)");
    }
}
