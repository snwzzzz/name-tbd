package com.example.ntbd.Exception;

/** Live data can't be used on this server as configured (e.g. no encryption key for credentials): 503. */
public class LiveDataUnavailableException extends RuntimeException {
    public LiveDataUnavailableException(String message) {
        super(message);
    }
}
