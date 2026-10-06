package com.example.ntbd.dto;

public record UserDto(
    Long id,
    String username,
    String email,
    String firstName,
    String lastName,
    String avatarUrl
){ }
