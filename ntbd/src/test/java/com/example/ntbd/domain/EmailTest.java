package com.example.ntbd.domain;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class EmailTest {

    @Test
    public void can_create_valid_email() {
        var email = new Email("snwzishot@gmail.com");
        assertThat(email).isNotNull();
    }

    @Test
    public void null_and_empty_email_throws_error() {
        assertThatThrownBy(() -> new Email(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void invalid_email_throws_error() {
        assertThatThrownBy(() -> new Email("X"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
