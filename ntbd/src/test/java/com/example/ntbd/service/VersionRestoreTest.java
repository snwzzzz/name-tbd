package com.example.ntbd.service;

import com.example.ntbd.Exception.VersionNotRestorableException;
import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.catalog.IdReferences;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.commands.*;
import com.example.ntbd.content.DefinitionNormalizer;
import com.example.ntbd.domain.*;
import com.example.ntbd.dto.VersionDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.VersionControlRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Versions: a restored version exports the same as the app did when it was saved (Phase 2's exit
 * criterion), a restore can be taken back, and automatic versions come at most every interval.
 */
@SpringBootTest(properties = "app.versions.auto-keep=2")
@Transactional
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class VersionRestoreTest {

    @Autowired private AccountService accountService;
    @Autowired private ApplicationService applicationService;
    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private SoftDeleteService softDeleteService;
    @Autowired private ChangeBatchService changeBatchService;
    @Autowired private VersionControlService versions;
    @Autowired private VersionControlRepository versionRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AppDefinitionService definitionService;
    @Autowired private WidgetCatalog catalog;
    @Autowired private IdReferences references;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EntityManager entityManager;

    private long branch;
    private long home;
    private long label;
    private long button;
    private long workflow;
    private long setText;
    private long people;

    @BeforeEach
    void buildAnApplication() {
        String id = "versions-" + UUID.randomUUID().toString().substring(0, 8);
        User user = accountService.signIn(new OidcProfile("urn:test", id, id + "@example.com", true, "Ada", "Lovelace", null, null));
        long workspaceId = accountService.me(user.getId()).workspaces().getFirst().id();
        TestSignIn.signInAs(user.getId().id());

        branch = applicationService.createApplication(new NewApplicationCommand(workspaceId, "Shop", "")).defaultBranchId();
        people = dataSourceService.importDataSource(
                new NewDataSourceCommand(branch, "People", "csv", "name,city\nAda,Bern\nBob,Basel")).id();
        home = pageService.createPage(new NewPageCommand("Home", "/", branch)).id();
        long detailPage = pageService.createPage(new NewPageCommand("Detail", "/detail", branch)).id();

        widget(home, "link", Map.of("text", "More", "pageId", String.valueOf(detailPage)), null, null);
        long box = widget(home, "container", Map.of(), null, null);
        label = widget(home, "label", Map.of("text", "Hi"), null, box);
        long table = widget(home, "table", Map.of("dataSourceId", String.valueOf(people)), null, null);
        workflow = workflowService.findOrCreateForPage(home).id();
        button = widget(home, "button", Map.of("text", "Go"), workflow, null);

        long trigger = node("Trigger", Map.of("triggerType", "element_click", "elementId", String.valueOf(button)));
        setText = node("Action", Map.of("actionType", "set_text", "config", Map.of("targetId", String.valueOf(label), "text", "Bye")));
        long search = node("Action", Map.of("actionType", "search", "config", Map.of("tableId", String.valueOf(table))));
        edgeService.createEdge(workflow, new NewEdgeCommand(trigger, setText, "out"));
        edgeService.createEdge(workflow, new NewEdgeCommand(setText, search, "out"));
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    private long widget(long page, String type, Map<String, Object> props, Long workflowId, Long parent) {
        return uiComponentService.createComponent(
                new NewUiComponentCommand(page, type, props, workflowId, parent, 1.0, 2.0, 3.0, 4.0)).id();
    }

    private long node(String type, Map<String, Object> props) {
        return nodeService.createNode(new NewNodeCommand(workflow, type, props, 10.0, 20.0)).id();
    }

    private Map<String, Object> exported() {
        return normalized(definitionService.build(branch));
    }

    private Map<String, Object> normalized(AppDefinition definition) {
        return DefinitionNormalizer.normalize(definition, objectMapper, catalog, references);
    }

    private static ChangeOperation op(String op, Long id) {
        return new ChangeOperation(op, id, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    /** Change everything, the way the editor does: moves, settings, deletes, new widgets, the flow, the data. */
    private void changeEverything() {
        Map<String, Object> moved = new HashMap<>();
        changeBatchService.apply(branch, new ChangeBatchCommand(List.of(
                new ChangeOperation("updateWidget", button, null, null, null, null, null, null, 30.0, 5.0, 4.0, 2.0,
                        Map.of("text", "Buy now"), null, null, null, null, null),
                op("deleteWidget", label),
                new ChangeOperation("createWidget", null, "new_1", home, null, "label", null, null, 0.0, 0.0, 2.0, 1.0,
                        Map.of("text", "New"), null, null, null, null, null),
                op("deleteNode", setText))));
        softDeleteService.deleteDataSource(people);
        dataSourceService.importDataSource(new NewDataSourceCommand(branch, "Orders", "csv", "id\n1"));
        assertThat(moved).isEmpty();
    }

    @Test
    void a_restored_version_exports_the_same_as_when_it_was_saved() {
        Map<String, Object> original = exported();
        VersionDto saved = versions.save(branch, "Before the redesign");

        changeEverything();
        assertThat(exported()).isNotEqualTo(original);

        versions.restore(saved.id());

        assertThat(exported()).isEqualTo(original);
        // Its preview showed the same
        assertThat(normalized(versions.definition(saved.id()))).isEqualTo(original);
    }

    @Test
    void a_restore_can_be_taken_back_by_restoring_the_version_it_made() {
        versions.save(branch, null);
        VersionDto first = versions.list(branch).getFirst();
        changeEverything();
        Map<String, Object> changed = exported();

        VersionDto before = versions.restore(first.id());

        assertThat(before.kind()).isEqualTo(VersionKind.RESTORE);
        assertThat(before.label()).isEqualTo("Before restoring version " + first.number());
        versions.restore(before.id());
        assertThat(exported()).isEqualTo(changed);
    }

    @Test
    void after_a_restore_soft_deleted_things_are_gone_for_good_and_a_duplicate_is_the_same_app() {
        VersionDto saved = versions.save(branch, null);
        changeEverything();
        versions.restore(saved.id());

        // What was deleted before the restore is gone, so it can't come back into the restored branch
        entityManager.flush();
        assertThat(((Number) entityManager.createNativeQuery("select count(*) from ui_component where id = :id")
                .setParameter("id", label).getSingleResult()).longValue()).isZero();

        long appId = branchRepository.findById(new Branch.BranchId(branch)).orElseThrow().getApplication().getId().id();
        long copyBranch = applicationService.duplicateApplication(appId, new DuplicateApplicationCommand("Copy")).defaultBranchId();
        assertThat(normalized(definitionService.build(copyBranch))).isEqualTo(exported());
    }

    @Test
    void numbers_versions_and_lists_them_newest_first() {
        versions.save(branch, "  One  ");
        versions.save(branch, "");
        VersionDto renamed = versions.rename(versions.list(branch).getFirst().id(), "Two");

        assertThat(versions.list(branch)).extracting(VersionDto::number, VersionDto::label)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(2, "Two"), org.assertj.core.groups.Tuple.tuple(1, "One"));
        assertThat(renamed.author()).isEqualTo("Ada Lovelace");
        assertThatThrownBy(() -> versions.rename(renamed.id(), "x".repeat(201))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void makes_a_version_before_export_only_when_something_changed() {
        assertThat(versions.snapshotIfChanged(branch, VersionKind.BEFORE_EXPORT, null)).isPresent();
        assertThat(versions.snapshotIfChanged(branch, VersionKind.BEFORE_EXPORT, null)).isEmpty();

        changeEverything();

        assertThat(versions.snapshotIfChanged(branch, VersionKind.BEFORE_EXPORT, null)).isPresent();
    }

    @Test
    void makes_automatic_versions_at_most_every_30_minutes_and_keeps_the_newest() {
        assertThat(versions.autoSnapshot(branch)).isPresent();
        changeEverything();
        assertThat(versions.autoSnapshot(branch)).as("within 30 minutes").isEmpty();

        for (int i = 0; i < 3; i++) {
            makeAutomaticVersionsOlder();
            widget(home, "label", Map.of("text", "Change " + i), null, null);
            assertThat(versions.autoSnapshot(branch)).isPresent();
        }

        // auto-keep=2 in this test: the oldest automatic versions went
        assertThat(versions.list(branch)).extracting(VersionDto::number).containsExactly(4, 3);
    }

    @Test
    void refuses_to_open_a_version_saved_in_the_old_format() {
        User author = userRepository.findAll().getFirst();
        VersionControl legacy = versionRepository.save(VersionControl.builder()
                .branch(branchRepository.getReferenceById(new Branch.BranchId(branch)))
                .number(versionRepository.lastNumber(branch) + 1).kind(VersionKind.LEGACY)
                .content("{\"pages\":[]}").modifiedBy(author).build());

        assertThatThrownBy(() -> versions.restore(legacy.getId().id())).isInstanceOf(VersionNotRestorableException.class);
        assertThat(versions.list(branch)).isEmpty();
    }

    private void makeAutomaticVersionsOlder() {
        entityManager.flush();
        entityManager.createNativeQuery(
                        "update \"version_control\" set created_at = created_at - interval '31' minute where branch_id = :branch")
                .setParameter("branch", branch)
                .executeUpdate();
        entityManager.clear();
    }
}
