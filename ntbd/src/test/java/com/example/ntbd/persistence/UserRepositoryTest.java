package com.example.ntbd.persistence;

import com.example.ntbd.domain.Email;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Username;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_save() {

        var user = User.builder()
                .username(new Username("snwz"))
                .email(new Email("snwzishot@gmail.com"))
                .password("password")
                .firstName("snwz")
                .lastName("ishot").build();

        var savedUser = userRepository.save(user);
        assertThat(userRepository.findById(savedUser.getId())).isNotNull();
    }
}
