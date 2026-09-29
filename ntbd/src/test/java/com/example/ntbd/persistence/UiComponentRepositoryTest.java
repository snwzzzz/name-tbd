package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.domain.User;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UiComponentRepositoryTest {

    @Autowired
    private UiComponentRepository uiComponentRepository;

    @Autowired
    private PageRepository pageRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_save_and_find_by_page() {
        var user = User.builder().username(new com.example.ntbd.domain.Username("test2")).email(new com.example.ntbd.domain.Email("test2@example.com")).password("test").firstName("Test").lastName("Test").build();
        userRepository.save(user);

        var app = Application.builder().title("App").description("Desc").build();
        applicationRepository.save(app);

        var branch = Branch.builder().name("main").description("main branch").createdBy(user).application(app).build();
        branchRepository.save(branch);

        var page = Page.builder().name("Home").path("/home").branch(branch).build();
        pageRepository.save(page);

        var component = UiComponent.builder()
                .type("BUTTON")
                .page(page)
                .props(Map.of("label", "Submit", "color", "blue"))
                .build();

        uiComponentRepository.save(component);

        var components = uiComponentRepository.findByPage_Id(page.getId());

        assertThat(components).hasSize(1);
        assertThat(components.get(0).getType()).isEqualTo("BUTTON");
        assertThat(components.get(0).getProps()).containsEntry("label", "Submit");
    }
}
