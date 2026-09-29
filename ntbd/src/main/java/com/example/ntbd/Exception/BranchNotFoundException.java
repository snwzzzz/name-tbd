package com.example.ntbd.Exception;

public class BranchNotFoundException extends ResourceNotFoundException {
    public BranchNotFoundException(Long id) {
        super("Branch not found with id: " + id);
    }
}