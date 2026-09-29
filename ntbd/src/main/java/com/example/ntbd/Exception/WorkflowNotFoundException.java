package com.example.ntbd.Exception;

public class WorkflowNotFoundException extends ResourceNotFoundException {
    public WorkflowNotFoundException(Long id) {
        super("Workflow not found with id: " + id);
    }
}
