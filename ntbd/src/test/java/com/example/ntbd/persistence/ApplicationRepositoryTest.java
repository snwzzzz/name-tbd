package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class ApplicationRepositoryTest {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Test
    void can_save() {

        var application = Application.builder()
                .title("Customer Portal")
                .description("Self-service portal for customers to manage their accounts and subscriptions.")
                .build();

        var savedApplication = applicationRepository.save(application);
        assertThat(applicationRepository.findById(savedApplication.getId())).isNotNull();
    }
}