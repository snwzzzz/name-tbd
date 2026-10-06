package com.example.ntbd.auth;

/** A sign-in that can't become an account; {@code code} is the OAuth2 error code the login page gets. */
public class SignInRejectedException extends RuntimeException {

    private final String code;

    public SignInRejectedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
