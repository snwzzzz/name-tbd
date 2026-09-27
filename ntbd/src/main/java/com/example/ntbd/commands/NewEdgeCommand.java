package com.example.ntbd.commands;

public record NewEdgeCommand(
        Long sourceNodeId,
        Long targetNodeId,
        String sourcePort
) {}
