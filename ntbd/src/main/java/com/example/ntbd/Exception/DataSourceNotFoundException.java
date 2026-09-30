package com.example.ntbd.Exception;

public class DataSourceNotFoundException extends ResourceNotFoundException {
    public DataSourceNotFoundException(Long id) {
        super("Data source not found with id: " + id);
    }
}
