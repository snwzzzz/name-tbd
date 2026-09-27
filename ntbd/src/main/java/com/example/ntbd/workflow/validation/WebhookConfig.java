package com.example.ntbd.workflow.validation;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WebhookConfig {
    @NotBlank
    private String url;

    private String method;

    private Object body;
}
