package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.User;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class PageRepositoryTest {

    @Autowired
    private PageRepository pageRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_save_and_find_by_branch() {
        var user = User.builder().username(new com.example.ntbd.domain.Username("test")).email(new com.example.ntbd.domain.Email("test@example.com")).password("test").firstName("Test").lastName("Test").build();
        userRepository.save(user);

        var app = Application.builder().title("App").description("Desc").build();
        applicationRepository.save(app);

        var branch = Branch.builder().name("main").description("main branch").createdBy(user).application(app).build();
        branchRepository.save(branch);

        var page = Page.builder().name("Home").path("/home").branch(branch).build();
        pageRepository.save(page);

        var pages = pageRepository.findByBranch_Id(branch.getId());

        assertThat(pages).hasSize(1);
        assertThat(pages.get(0).getName()).isEqualTo("Home");
        assertThat(pages.get(0).getPath()).isEqualTo("/home");
    }

    @Test
    void knows_whether_a_branch_has_a_layout_page() {
        var user = User.builder().username(new com.example.ntbd.domain.Username("layoutuser")).email(new com.example.ntbd.domain.Email("layout@example.com")).password("test").firstName("Test").lastName("Test").build();
        userRepository.save(user);
        var app = Application.builder().title("App").description("Desc").build();
        applicationRepository.save(app);
        var branch = branchRepository.save(Branch.builder().name("main").description("main branch").createdBy(user).application(app).build());

        pageRepository.save(Page.builder().name("Home").path("/home").branch(branch).build());
        assertThat(pageRepository.existsByBranch_IdAndLayoutTrue(branch.getId())).isFalse();

        pageRepository.save(Page.builder().name("Layout").path("/layout").branch(branch).layout(true).build());
        assertThat(pageRepository.existsByBranch_IdAndLayoutTrue(branch.getId())).isTrue();
    }
}
