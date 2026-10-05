package com.example.ntbd.Exception;

public class ConnectionNotFoundException extends ResourceNotFoundException {
    public ConnectionNotFoundException(Long id) {
        super("Connection not found with id: " + id);
    }
}
