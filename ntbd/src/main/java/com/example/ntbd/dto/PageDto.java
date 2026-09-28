package com.example.ntbd.dto;

public record PageDto(
        Long id,
        String name,
        String path,
        Long branchId
) {
}
