package com.example.ntbd.Exception;

/** The user may see the resource, but their role doesn't allow this (answered with 403). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
