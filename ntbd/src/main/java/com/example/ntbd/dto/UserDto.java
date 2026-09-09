package com.example.ntbd.dto;

public record UserDto(
    Long id,
    String username,
    String email,
    String password,
    String firstName,
    String lastName
){ }
