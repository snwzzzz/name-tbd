package com.example.ntbd.Exception;

import lombok.Getter;

import java.util.Collections;
import java.util.List;

@Getter
public class PasswordValidationException extends RuntimeException {

    private final List<String> errors;

    public PasswordValidationException(List<String> errors) {
        super(String.join("; ", errors));
        this.errors = Collections.unmodifiableList(errors);
    }

}
