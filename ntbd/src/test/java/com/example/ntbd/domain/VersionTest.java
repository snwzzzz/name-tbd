package com.example.ntbd.domain;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionTest {

    @Test
    public void can_create_valid_version() {
        var version = new Version("1.2.3");
        assertThat(version).isNotNull();
    }

    @Test
    public void valid_version_with_prerelease_and_metadata() {
        var version = new Version("1.0.0-alpha.1+build.123");
        assertThat(version).isNotNull();
    }

    @Test
    public void null_version_throws_error() {
        assertThatThrownBy(() -> new Version(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void empty_version_throws_error() {
        assertThatThrownBy(() -> new Version(""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void invalid_version_throws_error() {
        assertThatThrownBy(() -> new Version("X"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void version_missing_patch_number_throws_error() {
        assertThatThrownBy(() -> new Version("1.2"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}