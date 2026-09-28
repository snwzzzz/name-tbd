package com.example.ntbd.commands;

public record NewPageCommand(
        String name,
        String path,
        Long branchId
) {
}
