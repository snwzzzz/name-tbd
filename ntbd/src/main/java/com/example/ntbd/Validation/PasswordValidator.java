package com.example.ntbd.Validation;

import com.example.ntbd.Exception.PasswordValidationException;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor

public class PasswordValidator {

    private static final int MIN_LENGTH = 12;
    private static final int MAX_LENGTH = 128;

    public static void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new PasswordValidationException(List.of("Password must not be empty"));
        }

        List<String> errors = new ArrayList<>();

        if (password.length() < MIN_LENGTH) {
            errors.add("Password must be at least " + MIN_LENGTH + " characters long");
        }

        if (password.length() > MAX_LENGTH) {
            errors.add("Password must be no more than " + MAX_LENGTH + " characters long");
        }

        boolean hasLower = false;
        boolean hasUpper = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;

        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true;
        }

        if (!hasLower) errors.add("Password must contain at least one lowercase letter");
        if (!hasUpper) errors.add("Password must contain at least one uppercase letter");
        if (!hasDigit) errors.add("Password must contain at least one number");
        if (!hasSpecial) errors.add("Password must contain at least one special character");

        if (!errors.isEmpty()) {
            throw new PasswordValidationException(errors);
        }
    }
}
