package com.example.ntbd.commands;

import java.util.Map;

public record UpdateUiComponentCommand(
        Map<String, Object> props,
        Double x,
        Double y,
        Double w,
        Double h
) {}
