package com.example.ntbd.Exception;

public class EdgeNotFoundException extends ResourceNotFoundException {
    public EdgeNotFoundException(Long id) {
        super("Edge not found with id: " + id);
    }
}
