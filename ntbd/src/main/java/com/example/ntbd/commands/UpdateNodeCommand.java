package com.example.ntbd.commands;

import java.util.Map;

public record UpdateNodeCommand(
        Map<String, Object> props,
        Double x,
        Double y
) {}
