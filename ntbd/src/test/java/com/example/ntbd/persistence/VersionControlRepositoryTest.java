package com.example.ntbd.persistence;

import com.example.ntbd.domain.*;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionControlRepositoryTest {

    @Autowired
    private VersionControlRepository versionControlRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_save() {

        var user = User.builder()
                .username(new Username("snwz"))
                .email(new Email("snwzishot@gmail.com"))
                .password("password")
                .firstName("snwz")
                .lastName("ishot")
                .build();

        var savedUser = userRepository.save(user);

        var application = Application.builder()
                .title("Customer Portal")
                .description("Self-service portal for customers to manage their accounts and subscriptions.")
                .build();

        var savedApplication = applicationRepository.save(application);

        var branch = Branch.builder()
                .name("main")
                .description("Main development branch")
                .createdAt(LocalDateTime.now())
                .createdBy(savedUser)
                .application(savedApplication)
                .build();

        var savedBranch = branchRepository.saveAndFlush(branch);

        var versionControl = VersionControl.builder()
                .version(new Version("1.0.0"))
                .branch(savedBranch)
                .applicationDefinition("{}")
                .timestamp(LocalDateTime.now())
                .modifiedBy(savedUser)
                .build();

        var savedVersionControl = versionControlRepository.saveAndFlush(versionControl);
        assertThat(versionControlRepository.findById(savedVersionControl.getId())).isNotNull();
    }

    @Test
    void find_version_control_by_branch_order_by_timestamp() {
        var user = User.builder()
                .username(new Username("snwz"))
                .email(new Email("snwzishot@gmail.com"))
                .password("password")
                .firstName("snwz")
                .lastName("ishot")
                .build();

        var savedUser = userRepository.save(user);

        var application = Application.builder()
                .title("Customer Portal")
                .description("Self-service portal for customers to manage their accounts and subscriptions.")
                .build();

        var savedApplication = applicationRepository.save(application);

        var branch = Branch.builder()
                .name("main")
                .description("Main development branch")
                .createdAt(LocalDateTime.now())
                .createdBy(savedUser)
                .application(savedApplication)
                .build();

        var savedBranch = branchRepository.saveAndFlush(branch);

        var versionControl1 = VersionControl.builder()
                .version(new Version("1.0.0"))
                .branch(savedBranch)
                .applicationDefinition("{}")
                .timestamp(LocalDateTime.now())
                .modifiedBy(savedUser)
                .build();

        var versionControl2 = VersionControl.builder()
                .version(new Version("1.2.0"))
                .branch(savedBranch)
                .applicationDefinition("{}")
                .timestamp(LocalDateTime.now())
                .modifiedBy(savedUser)
                .build();

        var savedVersionControl = versionControlRepository.saveAllAndFlush(List.of(versionControl1, versionControl2));
        assertThat(versionControlRepository.findVersionControlByBranchOrderByTimestamp(savedBranch.getId(), Pageable.unpaged()).size()).isEqualTo(2);
    }

}
