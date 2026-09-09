package com.example.ntbd.Exception;

public class ApplicationNotFoundException extends ResourceNotFoundException {
    public ApplicationNotFoundException(Long id) {
        super("Application not found with id: " + id);
    }
}
