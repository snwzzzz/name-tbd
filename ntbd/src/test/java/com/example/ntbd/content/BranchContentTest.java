package com.example.ntbd.content;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.catalog.IdReferences;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.commands.*;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.User;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.persistence.ApplicationRepository;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.service.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A branch's content, read and written into another branch, is the same app: it exports the same. */
@SpringBootTest
@Transactional
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class BranchContentTest {

    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private SoftDeleteService softDeleteService;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private BranchContentReader reader;
    @Autowired private BranchContentWriter writer;
    @Autowired private AppDefinitionService definitionService;
    @Autowired private WidgetCatalog catalog;
    @Autowired private IdReferences references;
    @Autowired private ObjectMapper objectMapper;

    private User user;
    private long applicationId;
    private long branch;
    private long label;

    @BeforeEach
    void buildAnApplication() {
        String id = "content-" + UUID.randomUUID().toString().substring(0, 8);
        user = accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Test", null, null));
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
        TestSignIn.signInAs(user.getId().id());

        var app = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Shop", ""));
        applicationId = app.id();
        branch = app.defaultBranchId();
        long people = dataSourceService.importDataSource(
                new NewDataSourceCommand(branch, "People", "csv", "name,city\nAda,Bern\nBob,Basel")).id();

        long home = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
        long detailPage = pageService.createPage(new NewPageCommand("Detail", "/detail", branch)).id();
        long layout = pageService.createPage(new NewPageCommand("Layout", "/layout", branch, true)).id();

        widget(layout, "nav", Map.of("pages", "[%d,%d]".formatted(home, detailPage)), null, null);
        widget(home, "link", Map.of("text", "More", "pageId", String.valueOf(detailPage)), null, null);
        long box = widget(home, "container", Map.of(), null, null);
        label = widget(home, "label", Map.of("text", "Hi"), null, box);
        long table = widget(home, "table", Map.of("dataSourceId", String.valueOf(people), "columns", "[\"name\"]"), null, null);
        long workflow = workflowService.findOrCreateForPage(home).id();
        long button = widget(home, "button", Map.of("text", "Go"), workflow, null);
        long detail = widget(detailPage, "detail", Map.of("dataSourceId", String.valueOf(people)), null, null);

        long trigger = node(workflow, "Trigger", Map.of("triggerType", "element_click", "elementId", String.valueOf(button)));
        long setText = node(workflow, "Action", Map.of("actionType", "set_text",
                "config", Map.of("targetId", String.valueOf(label), "text", "Bye")));
        long showDetail = node(workflow, "Action", Map.of("actionType", "show_detail", "config", Map.of(
                "tableId", String.valueOf(table), "detailId", String.valueOf(detail), "detailPageId", String.valueOf(detailPage))));
        edgeService.createEdge(workflow, new NewEdgeCommand(trigger, setText, "out"));
        edgeService.createEdge(workflow, new NewEdgeCommand(setText, showDetail, "out"));
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    private long widget(long page, String type, Map<String, Object> props, Long workflow, Long parent) {
        return uiComponentService.createComponent(
                new NewUiComponentCommand(page, type, props, workflow, parent, 1.0, 2.0, 3.0, 4.0)).id();
    }

    private long node(long workflow, String type, Map<String, Object> props) {
        return nodeService.createNode(new NewNodeCommand(workflow, type, props, 10.0, 20.0)).id();
    }

    private long newBranch() {
        Application app = applicationRepository.findById(new Application.ApplicationId(applicationId)).orElseThrow();
        return branchRepository.save(Branch.builder().application(app).createdBy(user).name("other").description("").build())
                .getId().id();
    }

    private Map<String, Object> exported(long branchId) {
        return DefinitionNormalizer.normalize(definitionService.build(branchId), objectMapper, catalog, references);
    }

    @Test
    void written_into_another_branch_it_exports_the_same() {
        long other = newBranch();
        writer.write(reader.read(branch), branchRepository.getReferenceById(new Branch.BranchId(other)));

        Map<String, Object> original = exported(branch);
        assertThat(exported(other)).isEqualTo(original);
        // The comparison sees the references: they're labels, not raw ids
        assertThat(original.toString()).contains("detailPageId=page#2", "elementId=widget#");
    }

    @Test
    void reads_everything_in_order_and_leaves_soft_deleted_things_out() {
        softDeleteService.deleteWidget(label);

        BranchContent content = reader.read(branch);

        assertThat(content.format()).isEqualTo(BranchContent.FORMAT);
        assertThat(content.pages()).extracting(BranchContent.PageContent::name).containsExactly("Home", "Detail", "Layout");
        assertThat(content.pages().getFirst().widgets()).extracting(BranchContent.WidgetContent::type)
                .containsExactly("link", "container", "table", "button");
        assertThat(content.workflows().getFirst().nodes()).hasSize(3);
        assertThat(content.workflows().getFirst().edges()).hasSize(2);
        assertThat(content.dataSources().getFirst().rows()).containsExactly(List.of("Ada", "Bern"), List.of("Bob", "Basel"));
    }

    @Test
    void survives_a_trip_through_json_as_snapshots_store_it() {
        BranchContent content = reader.read(branch);

        BranchContent back = objectMapper.readValue(objectMapper.writeValueAsString(content), BranchContent.class);

        assertThat(back).isEqualTo(content);
        assertThat(definitionService.build(applicationId, "Shop", back).section("pages"))
                .isEqualTo(definitionService.build(branch).section("pages"));
    }

    @Test
    void refuses_content_of_an_unknown_format() {
        BranchContent future = new BranchContent(BranchContent.FORMAT + 1, List.of(), List.of(), List.of());

        assertThatThrownBy(() -> writer.write(future, branchRepository.getReferenceById(new Branch.BranchId(newBranch()))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
