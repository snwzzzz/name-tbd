package com.example.ntbd.Exception;

public class WorkspaceNotFoundException extends ResourceNotFoundException {
    public WorkspaceNotFoundException(Long id) {
        super("Workspace not found with id: " + id);
    }
}
