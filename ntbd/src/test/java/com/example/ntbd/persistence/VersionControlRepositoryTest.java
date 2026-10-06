package com.example.ntbd.persistence;

import com.example.ntbd.domain.*;
import com.example.ntbd.dto.VersionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionControlRepositoryTest {

    @Autowired private VersionControlRepository versionControlRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private UserRepository userRepository;

    private User user;
    private Branch branch;

    @BeforeEach
    void aBranch() {
        user = userRepository.save(User.builder()
                .username(new Username("snwz"))
                .email(new Email("snwzishot@gmail.com"))
                .firstName("snwz")
                .lastName("ishot")
                .build());
        var application = applicationRepository.save(Application.builder()
                .workspace(workspaceRepository.save(Workspace.builder().name("Workspace").build()))
                .title("Customer Portal")
                .description("")
                .build());
        branch = branchRepository.saveAndFlush(Branch.builder()
                .name("main").description("").createdBy(user).application(application).build());
    }

    private VersionControl version(int number, VersionKind kind, String hash) {
        return versionControlRepository.saveAndFlush(VersionControl.builder()
                .branch(branch).number(number).kind(kind).content("{}").contentHash(hash).sizeBytes(2).modifiedBy(user)
                .build());
    }

    @Test
    void lists_a_branchs_versions_newest_first_without_their_content_or_legacy_ones() {
        version(1, VersionKind.LEGACY, null);
        version(2, VersionKind.MANUAL, "a");
        version(3, VersionKind.AUTO, "b");

        assertThat(versionControlRepository.listByBranch(branch.getId().id()))
                .extracting(VersionDto::number, VersionDto::kind, VersionDto::author)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(3, VersionKind.AUTO, "snwz ishot"),
                        org.assertj.core.groups.Tuple.tuple(2, VersionKind.MANUAL, "snwz ishot"));
    }

    @Test
    void knows_the_last_number_and_the_newest_hash() {
        assertThat(versionControlRepository.lastNumber(branch.getId().id())).isZero();
        assertThat(versionControlRepository.latestHash(branch.getId().id(), PageRequest.of(0, 1))).isEmpty();

        version(1, VersionKind.MANUAL, "a");
        version(2, VersionKind.AUTO, "b");

        assertThat(versionControlRepository.lastNumber(branch.getId().id())).isEqualTo(2);
        assertThat(versionControlRepository.latestHash(branch.getId().id(), PageRequest.of(0, 1))).containsExactly("b");
        assertThat(versionControlRepository.idsOfKind(branch.getId().id(), VersionKind.AUTO)).hasSize(1);
    }
}
