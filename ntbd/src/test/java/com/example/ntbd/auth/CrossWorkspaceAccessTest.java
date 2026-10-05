package com.example.ntbd.auth;

import com.example.ntbd.commands.*;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.domain.WorkspaceMember;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.WorkspaceMemberRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import com.example.ntbd.service.*;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Nobody reaches another workspace's data: every API route, called by a user of workspace A with the
 * ids of workspace B's data, answers 404 (as if the data didn't exist).
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class CrossWorkspaceAccessTest {

    /** Routes that hold no workspace data, so there is nothing to scope. */
    private static final Set<String> UNSCOPED_ROUTES = Set.of(
            "GET /api/me",
            "GET /api/widget-props",
            "GET /api/widget-props/{type}",
            "GET /api/export/formats",
            "POST /api/dev/sign-in");

    @Autowired private MockMvc mockMvc;
    @Autowired @Qualifier("requestMappingHandlerMapping") private RequestMappingHandlerMapping handlerMapping;
    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private BranchService branchService;
    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private VersionControlService versionControlService;
    @Autowired private UserRepository userRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;

    /** One user's workspace with one of everything in it. */
    private record Tenant(long userId, long workspaceId, long app, long branch, long page, long component,
                          long workflow, long node, long otherNode, long edge, long dataSource, long version) {}

    private Tenant a;
    private Tenant b;
    private long viewerOfB;

    /** A route as the controller maps it ({@code pattern}) and as called here with B's ids ({@code path}). */
    private record Route(HttpMethod method, String pattern, String path, String body) {
        String key() { return method.name() + " " + pattern; }
    }

    @BeforeAll
    void createTwoWorkspaces() {
        String run = UUID.randomUUID().toString().substring(0, 8);
        a = tenant("a-" + run);
        b = tenant("b-" + run);

        // A third user who may only look at B's workspace
        User viewer = accountService.signIn(new OidcProfile(
                "urn:test", "viewer-" + run, "viewer-" + run + "@example.com", true, "V", "Iewer", null, null));
        memberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceRepository.getReferenceById(new Workspace.WorkspaceId(b.workspaceId())))
                .user(userRepository.getReferenceById(viewer.getId()))
                .role(WorkspaceRole.VIEWER)
                .build());
        viewerOfB = viewer.getId().id();
    }

    private Tenant tenant(String name) {
        User user = accountService.signIn(new OidcProfile(
                "urn:test", name, name + "@example.com", true, name, "Test", null, null));
        long userId = user.getId().id();
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();

        TestSignIn.signInAs(userId);
        try {
            long app = applicationService.createApplication(new NewApplicationCommand(workspaceId, name, "")).id();
            long branch = branchService.createBranch(new NewBranchCommand(app, "main", "")).id();
            long page = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
            long component = uiComponentService.createComponent(
                    new NewUiComponentCommand(page, "label", Map.of("text", "Hi"), null, null, 0.0, 0.0, 2.0, 1.0)).id();
            long workflow = workflowService.findOrCreateForPage(page).id();
            long node = nodeService.createNode(new NewNodeCommand(workflow, "Trigger", Map.of(), 0.0, 0.0)).id();
            long otherNode = nodeService.createNode(new NewNodeCommand(workflow, "Action", Map.of(), 1.0, 0.0)).id();
            long edge = edgeService.createEdge(workflow, new NewEdgeCommand(node, otherNode, "out")).id();
            long dataSource = dataSourceService.importDataSource(
                    new NewDataSourceCommand(branch, "People", "csv", "name\nAda")).id();
            long version = versionControlService.save(branch, "First").id();
            return new Tenant(userId, workspaceId, app, branch, page, component, workflow, node, otherNode, edge, dataSource, version);
        } finally {
            TestSignIn.signOut();
        }
    }

    /** Every scoped route, called with the data of {@code t}. */
    private List<Route> routes(Tenant t) {
        var routes = new ArrayList<Route>();
        RouteAdder add = (method, pattern, path, body) -> routes.add(new Route(method, pattern, path, body));
        HttpMethod GET = HttpMethod.GET, POST = HttpMethod.POST, PUT = HttpMethod.PUT, PATCH = HttpMethod.PATCH,
                DELETE = HttpMethod.DELETE;

        add.accept(GET, "/api/applications", "/api/applications?workspaceId=" + t.workspaceId(), null);
        add.accept(POST, "/api/applications", "/api/applications",
                "{\"workspaceId\":%d,\"title\":\"x\",\"description\":\"\"}".formatted(t.workspaceId()));
        add.accept(GET, "/api/applications/{id}", "/api/applications/" + t.app(), null);
        add.accept(PATCH, "/api/applications/{id}", "/api/applications/" + t.app(), "{\"title\":\"x\"}");
        add.accept(DELETE, "/api/applications/{id}", "/api/applications/" + t.app(), null);
        add.accept(POST, "/api/applications/{id}/duplicate", "/api/applications/%d/duplicate".formatted(t.app()), null);

        add.accept(POST, "/api/branches", "/api/branches",
                "{\"applicationId\":%d,\"name\":\"x\",\"description\":\"\"}".formatted(t.app()));
        add.accept(GET, "/api/branches", "/api/branches?applicationId=" + t.app(), null);
        add.accept(DELETE, "/api/branches/{id}", "/api/branches/" + t.branch(), null);
        add.accept(POST, "/api/branches/{id}/changes", "/api/branches/%d/changes".formatted(t.branch()), "{\"changes\":[]}");
        add.accept(GET, "/api/branches/{id}/variables", "/api/branches/%d/variables".formatted(t.branch()), null);
        add.accept(PUT, "/api/branches/{id}/variables", "/api/branches/%d/variables".formatted(t.branch()), "[]");

        add.accept(GET, "/api/branches/{branchId}/definition", "/api/branches/%d/definition".formatted(t.branch()), null);
        add.accept(GET, "/api/branches/{branchId}/export", "/api/branches/%d/export".formatted(t.branch()), null);

        add.accept(POST, "/api/data-sources", "/api/data-sources",
                "{\"branchId\":%d,\"name\":\"x\",\"format\":\"csv\",\"content\":\"a\\n1\"}".formatted(t.branch()));
        add.accept(GET, "/api/data-sources", "/api/data-sources?branchId=" + t.branch(), null);
        add.accept(GET, "/api/data-sources/{id}", "/api/data-sources/" + t.dataSource(), null);
        add.accept(DELETE, "/api/data-sources/{id}", "/api/data-sources/" + t.dataSource(), null);
        add.accept(POST, "/api/data-sources/{id}/restore", "/api/data-sources/%d/restore".formatted(t.dataSource()), null);

        add.accept(POST, "/api/pages", "/api/pages",
                "{\"name\":\"x\",\"path\":\"/x\",\"branchId\":%d}".formatted(t.branch()));
        add.accept(GET, "/api/pages", "/api/pages?branchId=" + t.branch(), null);
        add.accept(GET, "/api/pages/{id}", "/api/pages/" + t.page(), null);
        add.accept(GET, "/api/pages/{id}/ui-components", "/api/pages/%d/ui-components".formatted(t.page()), null);
        add.accept(GET, "/api/pages/{id}/workflow", "/api/pages/%d/workflow".formatted(t.page()), null);
        add.accept(GET, "/api/pages/{id}/full", "/api/pages/%d/full".formatted(t.page()), null);
        add.accept(PUT, "/api/pages/{id}/variables", "/api/pages/%d/variables".formatted(t.page()), "[]");

        add.accept(POST, "/api/ui-components", "/api/ui-components",
                "{\"pageId\":%d,\"type\":\"label\"}".formatted(t.page()));
        add.accept(GET, "/api/ui-components/{id}", "/api/ui-components/" + t.component(), null);
        add.accept(GET, "/api/ui-components/{id}/props", "/api/ui-components/%d/props".formatted(t.component()), null);
        add.accept(PUT, "/api/ui-components/{id}", "/api/ui-components/" + t.component(), "{\"x\":1}");
        add.accept(DELETE, "/api/ui-components/{id}", "/api/ui-components/" + t.component(), null);
        add.accept(POST, "/api/ui-components/{id}/restore", "/api/ui-components/%d/restore".formatted(t.component()), null);

        add.accept(POST, "/api/versions", "/api/versions", "{\"branchId\":%d,\"label\":\"x\"}".formatted(t.branch()));
        add.accept(GET, "/api/versions", "/api/versions?branchId=" + t.branch(), null);
        add.accept(PATCH, "/api/versions/{id}", "/api/versions/" + t.version(), "{\"label\":\"x\"}");
        add.accept(POST, "/api/versions/{id}/restore", "/api/versions/%d/restore".formatted(t.version()), null);
        add.accept(GET, "/api/versions/{id}/definition", "/api/versions/%d/definition".formatted(t.version()), null);
        add.accept(GET, "/api/versions/{id}/preview", "/api/versions/%d/preview".formatted(t.version()), null);

        String wf = "/api/workflows/" + t.workflow();
        add.accept(POST, "/api/workflows", "/api/workflows", "{\"branchId\":%d,\"name\":\"x\"}".formatted(t.branch()));
        add.accept(GET, "/api/workflows/{id}", wf, null);
        add.accept(GET, "/api/workflows", "/api/workflows?branchId=" + t.branch(), null);
        add.accept(DELETE, "/api/workflows/{id}", wf, null);
        add.accept(POST, "/api/workflows/{id}/execute", wf + "/execute", "{}");
        add.accept(POST, "/api/workflows/{id}/run", wf + "/run", "{}");
        add.accept(POST, "/api/workflows/{workflowId}/nodes", wf + "/nodes", "{\"type\":\"Action\",\"props\":{}}");
        add.accept(GET, "/api/workflows/{workflowId}/nodes", wf + "/nodes", null);
        add.accept(GET, "/api/workflows/{workflowId}/nodes/{nodeId}", wf + "/nodes/" + t.node(), null);
        add.accept(PUT, "/api/workflows/{workflowId}/nodes/{nodeId}", wf + "/nodes/" + t.node(), "{\"x\":1}");
        add.accept(DELETE, "/api/workflows/{workflowId}/nodes/{nodeId}", wf + "/nodes/" + t.node(), null);
        add.accept(POST, "/api/workflows/{workflowId}/nodes/{nodeId}/restore", wf + "/nodes/%d/restore".formatted(t.node()), null);
        add.accept(POST, "/api/workflows/{workflowId}/edges", wf + "/edges",
                "{\"sourceNodeId\":%d,\"targetNodeId\":%d,\"sourcePort\":\"out\"}".formatted(t.node(), t.otherNode()));
        add.accept(GET, "/api/workflows/{workflowId}/edges", wf + "/edges", null);
        add.accept(GET, "/api/workflows/{workflowId}/edges/{edgeId}", wf + "/edges/" + t.edge(), null);
        add.accept(DELETE, "/api/workflows/{workflowId}/edges/{edgeId}", wf + "/edges/" + t.edge(), null);
        add.accept(POST, "/api/workflows/{workflowId}/edges/{edgeId}/restore", wf + "/edges/%d/restore".formatted(t.edge()), null);
        return routes;
    }

    @FunctionalInterface
    private interface RouteAdder {
        void accept(HttpMethod method, String pattern, String path, String body);
    }

    private int call(long userId, HttpMethod method, String path, String body) throws Exception {
        MockHttpServletRequestBuilder request = request(method, path)
                .with(authentication(TestSignIn.authentication(userId)))
                .with(csrf());
        if (body != null) request.contentType("application/json").content(body);
        return mockMvc.perform(request).andReturn().getResponse().getStatus();
    }

    @Test
    void every_scoped_route_is_checked_here() {
        Set<String> mapped = new TreeSet<>();
        handlerMapping.getHandlerMethods().keySet().forEach(info -> {
            for (String pattern : info.getPatternValues()) {
                if (!pattern.startsWith("/api/")) continue;
                info.getMethodsCondition().getMethods().forEach(m -> mapped.add(m.name() + " " + pattern));
            }
        });
        Set<String> checked = new TreeSet<>(routes(b).stream().map(Route::key).toList());
        checked.addAll(UNSCOPED_ROUTES);

        // A new endpoint must be added to routes() (and checked by WorkspaceAccess), or to UNSCOPED_ROUTES
        assertThat(checked).containsAll(mapped);
    }

    @Test
    void another_workspaces_data_answers_404_on_every_route() throws Exception {
        List<String> leaks = new ArrayList<>();
        for (Route route : routes(b)) {
            int status = call(a.userId(), route.method(), route.path(), route.body());
            if (status != 404) leaks.add(route.method() + " " + route.path() + " -> " + status);
        }
        assertThat(leaks).isEmpty();
    }

    @Test
    void the_owner_reads_their_own_data_on_every_route() throws Exception {
        List<String> failures = new ArrayList<>();
        for (Route route : routes(b)) {
            if (route.method() != HttpMethod.GET) continue;
            int status = call(b.userId(), route.method(), route.path(), route.body());
            if (status != 200) failures.add(route.method() + " " + route.path() + " -> " + status);
        }
        assertThat(failures).isEmpty();
    }

    @Test
    void a_viewer_reads_but_cannot_change() throws Exception {
        for (Route route : routes(b)) {
            int status = call(viewerOfB, route.method(), route.path(), route.body());
            int expected = route.method() == HttpMethod.GET ? 200 : 403;
            assertThat(status).as(route.method() + " " + route.path()).isEqualTo(expected);
        }
    }

    @Test
    void the_application_list_shows_only_the_users_workspaces() throws Exception {
        var result = mockMvc.perform(request(HttpMethod.GET, "/api/applications")
                        .with(authentication(TestSignIn.authentication(a.userId()))))
                .andReturn().getResponse().getContentAsString();

        assertThat(result).contains("\"id\":" + a.app()).doesNotContain("\"id\":" + b.app() + ",");
    }

    @Test
    void own_data_cannot_be_wired_to_another_workspaces_data() throws Exception {
        // An edge in A's workflow between B's nodes
        assertThat(call(a.userId(), HttpMethod.POST, "/api/workflows/%d/edges".formatted(a.workflow()),
                "{\"sourceNodeId\":%d,\"targetNodeId\":%d,\"sourcePort\":\"out\"}".formatted(b.node(), b.otherNode())))
                .isEqualTo(404);
        // A widget on A's page inside B's widget, or running B's workflow
        assertThat(call(a.userId(), HttpMethod.POST, "/api/ui-components",
                "{\"pageId\":%d,\"type\":\"label\",\"parentId\":%d}".formatted(a.page(), b.component())))
                .isEqualTo(404);
        assertThat(call(a.userId(), HttpMethod.POST, "/api/ui-components",
                "{\"pageId\":%d,\"type\":\"button\",\"workflowId\":%d}".formatted(a.page(), b.workflow())))
                .isEqualTo(404);
        // Moving A's widget into B's widget
        assertThat(call(a.userId(), HttpMethod.PUT, "/api/ui-components/" + a.component(),
                "{\"parentId\":%d}".formatted(b.component())))
                .isEqualTo(404);
    }
}
