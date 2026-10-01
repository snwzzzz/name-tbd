package com.example.ntbd.export.definition;

/** What is exported: a branch of an application (its pages, workflows and data). */
public record ExportScope(Long branchId, Long applicationId, String applicationName) {
}
