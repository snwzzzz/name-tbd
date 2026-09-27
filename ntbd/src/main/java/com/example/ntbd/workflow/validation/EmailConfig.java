package com.example.ntbd.workflow.validation;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailConfig {
    @NotBlank
    private String to;

    @NotBlank
    private String subject;

    private String body;
}
