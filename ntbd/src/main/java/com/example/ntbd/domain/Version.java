package com.example.ntbd.domain;

import java.util.regex.Pattern;

public record Version(String value) {

    private static final Pattern PATTERN = Pattern.compile(
            "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$");

    public Version{
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("version cannot be null or empty");
        if (!PATTERN.matcher(value).matches())
            throw new IllegalArgumentException("version is not valid");
    }
}
