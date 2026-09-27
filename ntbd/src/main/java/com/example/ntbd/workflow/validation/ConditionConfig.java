package com.example.ntbd.workflow.validation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConditionConfig {
    @NotBlank
    private String field;

    @NotBlank
    private String operator;

    @NotNull
    private Object value;
}
