package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.VariableDefinition;
import com.example.ntbd.dto.VersionDto;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.workflow.sidecar.FlowSidecarClient;
import com.example.ntbd.workflow.sidecar.FlowSidecarUnavailableException;
import com.example.ntbd.workflow.sidecar.ServerFlowRunner;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Variables (an app's on its branch, a page's on the page): checked, exported, kept by versions;
 * and workflows run on the server through the flow sidecar, their row changes saved.
 */
@SpringBootTest
@Transactional
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class VariablesAndServerFlowsTest {

    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private PageService pageService;
    @Autowired private VariableService variables;
    @Autowired private VersionControlService versions;
    @Autowired private AppDefinitionService definitionService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private ServerFlowRunner runner;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private FlowSidecarClient sidecar;

    private long branch;
    private long home;

    private static final VariableDefinition LIMIT = new VariableDefinition("approvalLimit", "number", "500");
    private static final VariableDefinition STATUS = new VariableDefinition("status", "text", "\"Draft\"");

    @BeforeEach
    void buildAnApplication() {
        String id = "vars-" + UUID.randomUUID().toString().substring(0, 8);
        User user = accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Lovelace", null, null));
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
        TestSignIn.signInAs(user.getId().id());
        branch = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Approvals", "")).defaultBranchId();
        home = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> exported() {
        return objectMapper.convertValue(definitionService.build(branch), Map.class);
    }

    @Test
    void variables_are_saved_on_the_app_and_its_pages_and_exported() {
        variables.setAppVariables(branch, List.of(LIMIT));
        variables.setPageVariables(home, List.of(STATUS));

        assertThat(variables.appVariables(branch)).containsExactly(LIMIT);
        assertThat(pageService.findById(home).variables()).containsExactly(STATUS);

        Map<String, Object> definition = exported();
        assertThat(definition.get("variables")).isEqualTo(List.of(Map.of("name", "approvalLimit", "type", "number", "initial", "500")));
        Map<?, ?> page = (Map<?, ?>) ((List<?>) definition.get("pages")).getFirst();
        assertThat(page.get("variables")).isEqualTo(List.of(Map.of("name", "status", "type", "text", "initial", "\"Draft\"")));
    }

    @Test
    void variable_names_and_types_are_checked() {
        assertThatThrownBy(() -> variables.setAppVariables(branch, List.of(new VariableDefinition("2fast", "text", ""))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> variables.setAppVariables(branch, List.of(LIMIT, LIMIT)))
                .hasMessageContaining("Two variables");
        assertThatThrownBy(() -> variables.setAppVariables(branch, List.of(new VariableDefinition("params", "text", ""))))
                .hasMessageContaining("can't name a variable");
        assertThatThrownBy(() -> variables.setPageVariables(home, List.of(new VariableDefinition("x", "date", ""))))
                .hasMessageContaining("Unknown variable type");
    }

    @Test
    void a_restored_version_brings_its_variables_back() {
        variables.setAppVariables(branch, List.of(LIMIT));
        variables.setPageVariables(home, List.of(STATUS));
        VersionDto saved = versions.save(branch, "With variables");

        variables.setAppVariables(branch, List.of());
        variables.setPageVariables(home, List.of());
        versions.restore(saved.id());

        assertThat(variables.appVariables(branch)).containsExactly(LIMIT);
        long restoredHome = pageService.findByBranchId(branch).getFirst().id();
        assertThat(pageService.findById(restoredHome).variables()).containsExactly(STATUS);
    }

    @Test
    @SuppressWarnings("unchecked")
    void a_workflow_runs_on_the_sidecar_with_the_apps_variables_and_data_and_its_row_changes_are_saved() {
        variables.setAppVariables(branch, List.of(LIMIT));
        long orders = dataSourceService.importDataSource(new NewDataSourceCommand(branch, "orders", "csv", "customer,amount\nAda,750")).id();
        long workflow = workflowService.findOrCreateForPage(home).id();
        nodeService.createNode(new NewNodeCommand(workflow, "Trigger", Map.of("triggerType", "page_load"), 0.0, 0.0));

        Map<String, Object> answer = new HashMap<>();
        answer.put("steps", List.of("1:out"));
        answer.put("variables", Map.of("app", Map.of("approvalLimit", 500)));
        answer.put("data", List.of(Map.of("id", orders, "name", "orders", "columns", List.of("customer", "amount"),
                "rows", List.of(List.of("Ada", "750"), List.of("Bob", "20")))));
        answer.put("changes", List.of(Map.of("op", "add", "dataSourceId", orders, "rowId", "new-1",
                "values", Map.of("customer", "Bob", "amount", "20"))));
        ArgumentCaptor<Map<String, Object>> sent = ArgumentCaptor.forClass(Map.class);
        when(sidecar.run(sent.capture())).thenReturn(answer);

        Map<String, Object> result = runner.run(workflow, Map.of("amount", 20));

        Map<String, Object> request = sent.getValue();
        assertThat(((Map<String, Object>) request.get("variables")).get("app")).isEqualTo(List.of(LIMIT));
        assertThat(request.get("scope")).isEqualTo(Map.of("payload", Map.of("amount", 20)));
        assertThat(((Map<?, ?>) request.get("workflow")).get("nodes")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.LIST).hasSize(1);
        assertThat(result).containsEntry("steps", List.of("1:out")).doesNotContainKey("data").doesNotContainKey("changes");
        assertThat(dataSourceService.findById(orders).rows()).containsExactly(List.of("Ada", "750"), List.of("Bob", "20"));
        // Rows travel with their ids (database ids), so the flow's changes hit the right rows
        Map<?, ?> sentOrders = (Map<?, ?>) ((List<?>) request.get("data")).getFirst();
        assertThat(sentOrders.get("rowIds")).isEqualTo(dataSourceService.findById(orders).rowIds().subList(0, 1));
    }

    @Test
    void without_a_sidecar_a_server_run_is_unavailable() {
        long workflow = workflowService.findOrCreateForPage(home).id();
        when(sidecar.run(any())).thenThrow(new FlowSidecarUnavailableException("No flow sidecar is configured"));
        assertThatThrownBy(() -> runner.run(workflow, null)).isInstanceOf(FlowSidecarUnavailableException.class);
    }
}
