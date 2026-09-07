package com.example.ntbd.domain;

import java.util.regex.Pattern;

public record Email(String value) {

    private static final Pattern PATTERN = Pattern.compile(
            "\\A(?=[a-z0-9@.!#$%&'*+/=?^_`{|}~-]{6,254}\\z)"
                    + "(?=[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@)"
                    + "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
                    + "@(?:(?=[a-z0-9-]{1,63}\\.)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+"
                    + "(?=[a-z0-9-]{1,63}\\z)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\z",
            Pattern.CASE_INSENSITIVE
    );

    public Email {
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("value cannot be null or empty");
        if (!PATTERN.matcher(value).matches())
            throw new IllegalArgumentException("value is not valid");
    }
}
