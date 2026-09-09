package com.example.ntbd.persistence;

import com.example.ntbd.domain.*;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class BranchRepositoryTest {

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
        assertThat(branchRepository.findById(savedBranch.getId())).isNotNull();
    }

    @Test
    void find_by_application_id() {

        var user = User.builder()
                .username(new Username("snwz"))
                .email(new Email("snwzishot@gmail.com"))
                .password("password")
                .firstName("snwz")
                .lastName("ishot")
                .build();

        var savedUser = userRepository.save(user);

        Application app1 = applicationRepository.saveAndFlush(Application.builder().title("App 1").description("temp").build());
        Application app2 = applicationRepository.saveAndFlush(Application.builder().title("App 2").description("temp").build());

        branchRepository.saveAllAndFlush(List.of(
                Branch.builder()
                        .name("Branch A")
                        .description("Main development branch")
                        .createdAt(LocalDateTime.now())
                        .createdBy(savedUser)
                        .application(app1)
                        .build(),
                Branch.builder()
                        .name("Branch B")
                        .description("Main development branch")
                        .createdAt(LocalDateTime.now())
                        .createdBy(savedUser)
                        .application(app1)
                        .build(),
                Branch.builder()
                        .name("main")
                        .description("Main development branch")
                        .createdAt(LocalDateTime.now())
                        .createdBy(savedUser)
                        .application(app2)
                        .build())
                );

        var app1Branches = branchRepository.findBranchesByApplication_Id(app1.getId());

        assertThat((long) app1Branches.size()).isEqualTo(2);
        assertThat(app1Branches.stream().findFirst().map(Branch::getName)).contains("Branch A");
    }

    @Test
    void exists_by_id() {

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
        assertThat(branchRepository.existsById(savedBranch.getId())).isTrue();
    }
}