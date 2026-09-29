package com.example.ntbd.domain;

public record Username(String value) {

    public Username {
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("username cannot be null or empty");
        if(value.length() < 4)
            throw new IllegalArgumentException("username too short");
    }
}
