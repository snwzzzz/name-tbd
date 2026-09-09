package com.example.ntbd.Exception;

public class VersionControlNotFoundException extends ResourceNotFoundException {
    public VersionControlNotFoundException(Long id) {
        super("Version control record not found with id: " + id);
    }
}