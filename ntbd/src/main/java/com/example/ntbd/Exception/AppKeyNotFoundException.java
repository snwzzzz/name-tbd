package com.example.ntbd.Exception;

public class AppKeyNotFoundException extends ResourceNotFoundException {
    public AppKeyNotFoundException(Long id) {
        super("App key not found with id: " + id);
    }
}
