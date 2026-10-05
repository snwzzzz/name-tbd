package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.domain.WorkspaceMember;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.persistence.*;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** An application's life in the API: created with its branch, "last edited" kept current, renamed, deleted. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class ApplicationLifecycleTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AccountService accountService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private VersionControlService versionControlService;
    @Autowired private UserRepository userRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private PageRepository pageRepository;
    @Autowired private DataSourceRepository dataSourceRepository;

    private User user(String givenName) {
        String id = givenName + "-" + UUID.randomUUID().toString().substring(0, 8);
        return accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, givenName, "Test", null, null));
    }

    private long personalWorkspace(User user) {
        return accountService.me(user.getId()).workspaces().getFirst().id();
    }

    private JsonNode call(User user, MockHttpServletRequestBuilder request, int expectedStatus) throws Exception {
        String body = mockMvc.perform(request.with(authentication(TestSignIn.authentication(user.getId().id()))).with(csrf()))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString();
        return body.isEmpty() ? null : objectMapper.readTree(body);
    }

    private JsonNode createApp(User user, long workspaceId, String title) throws Exception {
        return call(user, post("/api/applications").contentType("application/json")
                .content("{\"workspaceId\":%d,\"title\":\"%s\"}".formatted(workspaceId, title)), 201);
    }

    @Test
    void a_new_application_has_its_default_branch_and_creator() throws Exception {
        User ada = user("Ada");
        JsonNode app = createApp(ada, personalWorkspace(ada), "  Shop  ");

        assertThat(app.get("title").asString()).isEqualTo("Shop");
        assertThat(app.get("description").asString()).isEmpty();
        assertThat(app.get("lastModifiedBy").asString()).isEqualTo("Ada Test");
        // An instant ("...Z"), whatever the server's time zone, so browsers show their own local time
        java.time.Instant edited = java.time.Instant.parse(app.get("lastModified").asString());
        assertThat(edited).isBetween(java.time.Instant.now().minusSeconds(60), java.time.Instant.now().plusSeconds(1));
        long branchId = app.get("defaultBranchId").asLong();
        assertThat(branchRepository.findById(new com.example.ntbd.domain.Branch.BranchId(branchId)))
                .hasValueSatisfying(branch -> assertThat(branch.getName()).isEqualTo("main"));
    }

    @Test
    void a_change_inside_the_application_updates_last_edited() throws Exception {
        User ada = user("Ada");
        long workspaceId = personalWorkspace(ada);
        JsonNode app = createApp(ada, workspaceId, "Shop");
        long appId = app.get("id").asLong();

        // Grace, an editor in Ada's workspace, adds a page
        User grace = user("Grace");
        memberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceRepository.getReferenceById(new Workspace.WorkspaceId(workspaceId)))
                .user(userRepository.getReferenceById(grace.getId()))
                .role(WorkspaceRole.EDITOR)
                .build());
        call(grace, post("/api/pages").contentType("application/json")
                .content("{\"name\":\"Home\",\"path\":\"/\",\"branchId\":%d}".formatted(app.get("defaultBranchId").asLong())), 201);

        JsonNode after = call(ada, get("/api/applications/" + appId), 200);
        assertThat(after.get("lastModifiedBy").asString()).isEqualTo("Grace Test");
        assertThat(after.get("lastModified").asString()).isGreaterThanOrEqualTo(app.get("lastModified").asString());
    }

    @Test
    void a_failed_change_does_not_count_as_an_edit() throws Exception {
        User ada = user("Ada");
        long workspaceId = personalWorkspace(ada);
        JsonNode app = createApp(ada, workspaceId, "Shop");
        User grace = user("Grace");
        memberRepository.save(WorkspaceMember.builder()
                .workspace(workspaceRepository.getReferenceById(new Workspace.WorkspaceId(workspaceId)))
                .user(userRepository.getReferenceById(grace.getId()))
                .role(WorkspaceRole.EDITOR)
                .build());

        call(grace, patch("/api/applications/" + app.get("id").asLong()).contentType("application/json")
                .content("{\"title\":\"   \"}"), 400);

        JsonNode after = call(ada, get("/api/applications/" + app.get("id").asLong()), 200);
        assertThat(after.get("title").asString()).isEqualTo("Shop");
        assertThat(after.get("lastModifiedBy").asString()).isEqualTo("Ada Test");
    }

    @Test
    void renaming_changes_title_and_description() throws Exception {
        User ada = user("Ada");
        JsonNode app = createApp(ada, personalWorkspace(ada), "Shop");

        JsonNode renamed = call(ada, patch("/api/applications/" + app.get("id").asLong()).contentType("application/json")
                .content("{\"title\":\"Store\",\"description\":\"Sells things\"}"), 200);

        assertThat(renamed.get("title").asString()).isEqualTo("Store");
        assertThat(renamed.get("description").asString()).isEqualTo("Sells things");
    }

    @Test
    void deleting_removes_the_application_with_everything_in_it() throws Exception {
        User ada = user("Ada");
        JsonNode app = createApp(ada, personalWorkspace(ada), "Shop");
        long appId = app.get("id").asLong();
        long branchId = app.get("defaultBranchId").asLong();

        // One of everything: pages with nested widgets, a workflow with an edge, data, a version
        long pageId = call(ada, post("/api/pages").contentType("application/json")
                .content("{\"name\":\"Home\",\"path\":\"/\",\"branchId\":%d}".formatted(branchId)), 201).get("id").asLong();
        TestSignIn.signInAs(ada.getId().id());
        try {
            long box = uiComponentService.createComponent(
                    new NewUiComponentCommand(pageId, "container", Map.of(), null, null, 0.0, 0.0, 4.0, 4.0)).id();
            uiComponentService.createComponent(
                    new NewUiComponentCommand(pageId, "label", Map.of("text", "Hi"), null, box, 0.0, 0.0, 2.0, 1.0));
            long workflow = workflowService.findOrCreateForPage(pageId).id();
            uiComponentService.createComponent(
                    new NewUiComponentCommand(pageId, "button", Map.of(), workflow, null, 5.0, 0.0, 2.0, 1.0));
            long trigger = nodeService.createNode(new NewNodeCommand(workflow, "Trigger", Map.of(), 0.0, 0.0)).id();
            long action = nodeService.createNode(new NewNodeCommand(workflow, "Action", Map.of(), 1.0, 0.0)).id();
            edgeService.createEdge(workflow, new NewEdgeCommand(trigger, action, "out"));
            dataSourceService.importDataSource(new NewDataSourceCommand(branchId, "People", "csv", "name\nAda"));
            versionControlService.save(branchId, "First");
        } finally {
            TestSignIn.signOut();
        }

        call(ada, delete("/api/applications/" + appId), 204);

        call(ada, get("/api/applications/" + appId), 404);
        assertThat(branchRepository.existsById(new com.example.ntbd.domain.Branch.BranchId(branchId))).isFalse();
        assertThat(pageRepository.existsById(new com.example.ntbd.domain.Page.PageId(pageId))).isFalse();
        assertThat(dataSourceRepository.findAll()).noneMatch(d -> d.getBranch().getId().id() == branchId);
    }

    @Test
    void a_page_loads_in_one_answer_with_complete_props_and_its_workflow() throws Exception {
        User ada = user("Ada");
        JsonNode app = createApp(ada, personalWorkspace(ada), "Shop");
        long pageId = call(ada, post("/api/pages").contentType("application/json")
                .content("{\"name\":\"Home\",\"path\":\"/\",\"branchId\":%d}".formatted(app.get("defaultBranchId").asLong())), 201)
                .get("id").asLong();
        TestSignIn.signInAs(ada.getId().id());
        long label;
        try {
            label = uiComponentService.createComponent(
                    new NewUiComponentCommand(pageId, "label", Map.of("text", "Hi"), null, null, 0.0, 0.0, 2.0, 1.0)).id();
            long workflow = workflowService.findOrCreateForPage(pageId).id();
            nodeService.createNode(new NewNodeCommand(workflow, "Trigger", Map.of("triggerType", "page_load"), 0.0, 0.0));
        } finally {
            TestSignIn.signOut();
        }

        JsonNode content = call(ada, get("/api/pages/%d/full".formatted(pageId)), 200);

        assertThat(content.get("page").get("name").asString()).isEqualTo("Home");
        JsonNode widget = content.get("components").get(0);
        assertThat(widget.get("id").asLong()).isEqualTo(label);
        // Its own text, and its type's defaults for everything else
        assertThat(widget.get("props").get("text").asString()).isEqualTo("Hi");
        assertThat(widget.get("props").size()).isGreaterThan(1);
        assertThat(content.get("workflow").get("nodes").size()).isEqualTo(1);
        assertThat(content.get("workflow").get("edges").size()).isZero();
    }

    @Test
    void the_default_branch_cannot_be_deleted() throws Exception {
        User ada = user("Ada");
        JsonNode app = createApp(ada, personalWorkspace(ada), "Shop");

        call(ada, delete("/api/branches/" + app.get("defaultBranchId").asLong()), 400);
    }
}
