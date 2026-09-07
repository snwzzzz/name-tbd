package com.example.ntbd.domain.persistence;

import com.example.ntbd.domain.domain.User;
import com.example.ntbd.persistence.UserRepository;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_save() {

        //var user = User.builder()
                //.email("ste210578@");
    }
}
