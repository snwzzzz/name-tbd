package com.example.ntbd.auth;

/** The request needs a signed-in user and has none (answered with 401). */
public class NotSignedInException extends RuntimeException {
    public NotSignedInException() {
        super("Not signed in");
    }
}
