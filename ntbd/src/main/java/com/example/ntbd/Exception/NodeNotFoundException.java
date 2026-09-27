package com.example.ntbd.Exception;

public class NodeNotFoundException extends ResourceNotFoundException {
    public NodeNotFoundException(Long id) {
        super("Node not found with id: " + id);
    }
}
