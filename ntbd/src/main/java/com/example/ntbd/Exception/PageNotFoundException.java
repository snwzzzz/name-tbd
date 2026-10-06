package com.example.ntbd.Exception;

public class PageNotFoundException extends ResourceNotFoundException {
    public PageNotFoundException(String message) {
        super(message);
    }
}
