package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.User;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.UiComponentDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** The editor's batches of changes: applied in order, refs resolved, all or nothing, only within the branch. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class ChangeBatchTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;

    private User user;
    private long branch;
    private long page;
    private long workflow;
    private long label;

    @BeforeEach
    void buildAPage() {
        user = newUser();
        TestSignIn.signInAs(user.getId().id());
        try {
            long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
            ApplicationDto app = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Shop", ""));
            branch = app.defaultBranchId();
            page = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
            workflow = workflowService.findOrCreateForPage(page).id();
            label = uiComponentService.createComponent(
                    new NewUiComponentCommand(page, "label", Map.of("text", "Hi"), null, null, 0.0, 0.0, 2.0, 1.0)).id();
        } finally {
            TestSignIn.signOut();
        }
    }

    private User newUser() {
        String id = "cb-" + UUID.randomUUID().toString().substring(0, 8);
        return accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Test", null, null));
    }

    private record Answer(int status, JsonNode body) {}

    private Answer send(User as, long branchId, Object... changes) throws Exception {
        var response = mockMvc.perform(post("/api/branches/%d/changes".formatted(branchId))
                        .with(authentication(TestSignIn.authentication(as.getId().id()))).with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("changes", List.of(changes)))))
                .andReturn().getResponse();
        String body = response.getContentAsString();
        return new Answer(response.getStatus(), body.isEmpty() ? null : objectMapper.readTree(body));
    }

    private static Map<String, Object> change(Object... keysAndValues) {
        Map<String, Object> change = new java.util.LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) change.put((String) keysAndValues[i], keysAndValues[i + 1]);
        return change;
    }

    private List<UiComponentDto> widgets() {
        return uiComponentService.findByPageId(page);
    }

    @Test
    void creates_things_that_point_at_each_other_by_ref() throws Exception {
        Answer answer = send(user, branch,
                change("op", "createWidget", "ref", "new_box", "pageId", page, "type", "container", "x", 0, "y", 0, "w", 6, "h", 4),
                change("op", "createWidget", "ref", "new_btn", "pageId", page, "type", "button", "parentRef", "new_box",
                        "x", 0, "y", 0, "w", 2, "h", 1, "props", Map.of("text", "Go")),
                change("op", "createNode", "ref", "new_trigger", "workflowId", workflow, "type", "Trigger",
                        "props", Map.of("triggerType", "element_click", "elementId", "new_btn"), "x", 0, "y", 0),
                change("op", "createNode", "ref", "new_action", "workflowId", workflow, "type", "Action",
                        "props", Map.of("actionType", "set_text", "config", Map.of("targetId", String.valueOf(label), "text", "Bye")), "x", 1, "y", 0),
                change("op", "createEdge", "ref", "new_edge", "workflowId", workflow,
                        "sourceRef", "new_trigger", "targetRef", "new_action", "sourcePort", "out"));

        assertThat(answer.status()).isEqualTo(200);
        JsonNode ids = answer.body().get("ids");
        long box = ids.get("new_box").asLong();
        long button = ids.get("new_btn").asLong();
        assertThat(widgets()).filteredOn(w -> w.id() == button).singleElement()
                .satisfies(w -> assertThat(w.parentId()).isEqualTo(box));

        NodeDto trigger = nodeService.findById(ids.get("new_trigger").asLong());
        // A ref in a node's widget settings becomes the widget's id
        assertThat(trigger.props().get("elementId")).isEqualTo(String.valueOf(button));
        assertThat(edgeService.findByWorkflowId(workflow)).singleElement().satisfies(e -> {
            assertThat(e.sourceNodeId()).isEqualTo(trigger.id());
            assertThat(e.targetNodeId()).isEqualTo(ids.get("new_action").asLong());
        });
    }

    @Test
    void updates_deletes_and_restores_in_order() throws Exception {
        Answer answer = send(user, branch,
                change("op", "updateWidget", "id", label, "x", 5, "y", 6, "props", Map.of("text", "Moved")),
                change("op", "deleteWidget", "id", label),
                change("op", "restoreWidget", "id", label));

        assertThat(answer.status()).isEqualTo(200);
        UiComponentDto moved = uiComponentService.findById(label);
        assertThat(moved.x()).isEqualTo(5.0);
        assertThat(moved.props()).containsEntry("text", "Moved");
    }

    @Test
    void a_change_to_something_created_and_changed_in_the_same_batch_uses_its_ref() throws Exception {
        Answer answer = send(user, branch,
                change("op", "createWidget", "ref", "new_a", "pageId", page, "type", "label", "x", 0, "y", 3, "w", 2, "h", 1),
                change("op", "updateWidget", "ref", "new_a", "x", 9),
                change("op", "deleteWidget", "ref", "new_a"));

        assertThat(answer.status()).isEqualTo(200);
        assertThat(widgets()).extracting(UiComponentDto::id).containsExactly(label);
    }

    @Test
    void when_one_change_fails_none_is_saved_and_the_answer_says_which() throws Exception {
        Answer answer = send(user, branch,
                change("op", "updateWidget", "id", label, "x", 7),
                change("op", "createWidget", "ref", "new_a", "pageId", page, "type", "label", "x", 0, "y", 3, "w", 2, "h", 1),
                change("op", "updateWidget", "id", 987654321L, "x", 1));

        assertThat(answer.status()).isEqualTo(404);
        assertThat(answer.body().get("index").asInt()).isEqualTo(2);
        assertThat(uiComponentService.findById(label).x()).isEqualTo(0.0);
        assertThat(widgets()).hasSize(1);
    }

    @Test
    void another_branchs_things_count_as_not_found() throws Exception {
        // A second app of the same user: its widget may not be changed through this branch
        TestSignIn.signInAs(user.getId().id());
        long otherLabel;
        long otherBranch;
        try {
            long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
            otherBranch = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Other", "")).defaultBranchId();
            long otherPage = pageService.createPage(new NewPageCommand("Home", "/", otherBranch)).id();
            otherLabel = uiComponentService.createComponent(
                    new NewUiComponentCommand(otherPage, "label", Map.of(), null, null, 0.0, 0.0, 1.0, 1.0)).id();
        } finally {
            TestSignIn.signOut();
        }

        assertThat(send(user, branch, change("op", "deleteWidget", "id", otherLabel)).status()).isEqualTo(404);
        assertThat(send(user, branch, change("op", "createWidget", "ref", "new_x", "pageId", page, "type", "label",
                "parentId", otherLabel, "x", 0, "y", 0, "w", 1, "h", 1)).status()).isEqualTo(404);
        assertThat(send(user, branch, change("op", "createNode", "ref", "new_n", "workflowId", 987654321L, "type", "Trigger",
                "props", Map.of(), "x", 0, "y", 0)).status()).isEqualTo(404);
    }

    @Test
    void someone_elses_branch_is_not_found_and_mistakes_are_bad_requests() throws Exception {
        assertThat(send(newUser(), branch, change("op", "deleteWidget", "id", label)).status()).isEqualTo(404);

        Answer unknown = send(user, branch, change("op", "explode", "id", label));
        assertThat(unknown.status()).isEqualTo(400);
        Answer twice = send(user, branch,
                change("op", "createWidget", "ref", "new_a", "pageId", page, "type", "label", "x", 0, "y", 3, "w", 1, "h", 1),
                change("op", "createWidget", "ref", "new_a", "pageId", page, "type", "label", "x", 2, "y", 3, "w", 1, "h", 1));
        assertThat(twice.status()).isEqualTo(400);
        assertThat(twice.body().get("index").asInt()).isEqualTo(1);
    }
}
