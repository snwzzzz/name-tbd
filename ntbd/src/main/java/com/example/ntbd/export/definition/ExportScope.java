package com.example.ntbd.export.definition;

import com.example.ntbd.content.BranchContent;

/**
 * What is exported: an application's content (its pages, workflows and data), from a branch or from a
 * saved version, and how ({@link ExportOptions}: e.g. with its data embedded or live).
 */
public record ExportScope(Long applicationId, String applicationName, BranchContent content, ExportOptions options) {

    public ExportScope {
        options = options == null ? ExportOptions.EMBED : options;
    }

    public ExportScope(Long applicationId, String applicationName, BranchContent content) {
        this(applicationId, applicationName, content, ExportOptions.EMBED);
    }
}
