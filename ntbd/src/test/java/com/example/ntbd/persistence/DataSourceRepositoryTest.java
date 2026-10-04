package com.example.ntbd.persistence;

import com.example.ntbd.domain.Workspace;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.datasource.TabularDataParserRegistry;
import com.example.ntbd.datasource.parsers.CsvParser;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.service.DataSourceService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Stores a data source through the service, against the real (migrated) schema. */
@DataJpaTest
@Import({DataSourceService.class, TabularDataParserRegistry.class, CsvParser.class})
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class DataSourceRepositoryTest {

    @Autowired
    private DataSourceService dataSourceService;

    @Autowired
    private DataSourceRepository dataSourceRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void can_import_find_and_delete_a_data_source() {
        Branch branch = createBranch();
        Long branchId = branch.getId().id();

        DataSourceDto created = dataSourceService.importDataSource(
                new NewDataSourceCommand(branchId, "People", "csv", "name,age\nAlice,30\nBob,25"));
        entityManager.clear();

        DataSourceDto found = dataSourceService.findById(created.id());
        assertThat(found.columns()).containsExactly("name", "age");
        assertThat(found.rows()).containsExactly(List.of("Alice", "30"), List.of("Bob", "25"));

        var summaries = dataSourceService.findByBranchId(branchId);
        assertThat(summaries).hasSize(1);
        assertThat(summaries.getFirst().rowCount()).isEqualTo(2);

    }

    private Branch createBranch() {
        var user = User.builder().username(new Username("datauser")).email(new Email("data@example.com")).firstName("Test").lastName("Test").build();
        userRepository.save(user);

        var app = Application.builder().workspace(workspaceRepository.save(Workspace.builder().name("Workspace").build())).title("App").description("Desc").build();
        applicationRepository.save(app);

        var branch = Branch.builder().name("main").description("main branch").createdBy(user).application(app).build();
        return branchRepository.save(branch);
    }
}
