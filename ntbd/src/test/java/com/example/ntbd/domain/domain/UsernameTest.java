package com.example.ntbd.domain.domain;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UsernameTest {

    @Test
    public void can_create_valid_email() {
        var username = new Username("snwz");
        assertThat(username).isNotNull();
    }

    @Test
    public void null_and_empty_username_throws_error() {
        assertThatThrownBy(() -> new Username(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void invalid_username_throws_error() {
        assertThatThrownBy(() -> new Username("X"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
