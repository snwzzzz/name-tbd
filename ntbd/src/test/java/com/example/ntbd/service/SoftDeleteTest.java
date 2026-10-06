package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.domain.User;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.export.definition.AppDefinitionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Deleting marks things; restoring brings back exactly what was deleted together, with the same ids. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class SoftDeleteTest {

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
    @Autowired private SoftDeleteService softDelete;
    @Autowired private AppDefinitionService definitionService;

    private User user;
    private long branch;
    private long page;
    private long box;
    private long inside;
    private long other;
    private long workflow;
    private long trigger;
    private long action;
    private long edge;
    private long people;

    @BeforeEach
    void buildAPage() {
        String id = "sd-" + UUID.randomUUID().toString().substring(0, 8);
        user = accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Test", null, null));
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
        TestSignIn.signInAs(user.getId().id());
        try {
            ApplicationDto app = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Shop", ""));
            branch = app.defaultBranchId();
            page = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
            box = widget("container", null);
            inside = widget("label", box);
            other = widget("button", null);
            workflow = workflowService.findOrCreateForPage(page).id();
            trigger = nodeService.createNode(new NewNodeCommand(workflow, "Trigger", Map.of(), 0.0, 0.0)).id();
            action = nodeService.createNode(new NewNodeCommand(workflow, "Action", Map.of(), 1.0, 0.0)).id();
            edge = edgeService.createEdge(workflow, new NewEdgeCommand(trigger, action, "out")).id();
            people = dataSourceService.importDataSource(new NewDataSourceCommand(branch, "People", "csv", "name\nAda")).id();
        } finally {
            TestSignIn.signOut();
        }
    }

    private long widget(String type, Long parent) {
        return uiComponentService.createComponent(new NewUiComponentCommand(page, type, Map.of(), null, parent, 0.0, 0.0, 2.0, 2.0)).id();
    }

    private int call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(authentication(TestSignIn.authentication(user.getId().id()))).with(csrf()))
                .andReturn().getResponse().getStatus();
    }

    private List<Long> widgetIds() {
        return uiComponentService.findByPageId(page).stream().map(w -> w.id()).sorted().toList();
    }

    @Test
    void a_deleted_container_takes_its_widgets_along_and_comes_back_with_them() throws Exception {
        assertThat(call(delete("/api/ui-components/" + box))).isEqualTo(204);

        assertThat(widgetIds()).containsExactly(other);
        assertThat(call(get("/api/ui-components/" + inside))).isEqualTo(404);

        assertThat(call(post("/api/ui-components/%d/restore".formatted(box)))).isEqualTo(204);

        assertThat(widgetIds()).containsExactly(box, inside, other);
        assertThat(call(get("/api/ui-components/" + inside))).isEqualTo(200);
    }

    @Test
    void a_widget_deleted_before_its_container_stays_deleted() throws Exception {
        call(delete("/api/ui-components/" + inside));
        call(delete("/api/ui-components/" + box));

        call(post("/api/ui-components/%d/restore".formatted(box)));

        assertThat(widgetIds()).containsExactly(box, other);
    }

    @Test
    void a_widget_comes_back_only_after_its_container() throws Exception {
        call(delete("/api/ui-components/" + inside));
        call(delete("/api/ui-components/" + box));

        assertThat(call(post("/api/ui-components/%d/restore".formatted(inside)))).isEqualTo(400);
    }

    @Test
    void restoring_what_exists_changes_nothing() throws Exception {
        assertThat(call(post("/api/ui-components/%d/restore".formatted(other)))).isEqualTo(204);
        assertThat(widgetIds()).containsExactly(box, inside, other);
    }

    @Test
    void a_deleted_node_takes_its_edges_along_and_comes_back_with_them() throws Exception {
        String nodes = "/api/workflows/%d/nodes/".formatted(workflow);
        assertThat(call(delete(nodes + action))).isEqualTo(204);

        assertThat(nodeService.findByWorkflowId(workflow)).extracting(n -> n.id()).containsExactly(trigger);
        assertThat(edgeService.findByWorkflowId(workflow)).isEmpty();

        assertThat(call(post(nodes + action + "/restore"))).isEqualTo(204);

        assertThat(nodeService.findByWorkflowId(workflow)).hasSize(2);
        assertThat(edgeService.findByWorkflowId(workflow)).extracting(e -> e.id()).containsExactly(edge);
    }

    @Test
    void an_edge_comes_back_only_when_both_its_nodes_exist() throws Exception {
        String base = "/api/workflows/%d/".formatted(workflow);
        call(delete(base + "edges/" + edge));
        call(delete(base + "nodes/" + action));

        assertThat(call(post(base + "edges/" + edge + "/restore"))).isEqualTo(400);

        call(post(base + "nodes/" + action + "/restore"));
        // The edge was deleted on its own before: restoring the node doesn't bring it back, restoring the edge does
        assertThat(edgeService.findByWorkflowId(workflow)).isEmpty();
        assertThat(call(post(base + "edges/" + edge + "/restore"))).isEqualTo(204);
        assertThat(edgeService.findByWorkflowId(workflow)).hasSize(1);
    }

    @Test
    void a_deleted_data_source_comes_back_with_its_rows() throws Exception {
        assertThat(call(delete("/api/data-sources/" + people))).isEqualTo(204);
        assertThat(dataSourceService.findByBranchId(branch)).isEmpty();

        assertThat(call(post("/api/data-sources/%d/restore".formatted(people)))).isEqualTo(204);

        assertThat(dataSourceService.findById(people).rows()).containsExactly(List.of("Ada"));
    }

    @Test
    void deleted_things_are_not_exported() throws Exception {
        call(delete("/api/ui-components/" + box));
        call(delete("/api/data-sources/" + people));

        String definition = objectMapper.writeValueAsString(definitionService.build(branch));

        assertThat(definition).doesNotContain("\"id\":" + box + ",").doesNotContain("\"id\":" + inside + ",")
                .doesNotContain("People").contains("\"id\":" + other + ",");
    }

    @Test
    void after_the_purge_deleted_things_are_gone_for_good() throws Exception {
        call(delete("/api/ui-components/" + box));

        softDelete.purgeDeletedBefore(Timestamps.nowUtc().plusSeconds(1));

        assertThat(call(post("/api/ui-components/%d/restore".formatted(box)))).isEqualTo(404);
        assertThat(widgetIds()).containsExactly(other);
    }
}
