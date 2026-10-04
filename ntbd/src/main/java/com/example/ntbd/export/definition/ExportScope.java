package com.example.ntbd.export.definition;

import com.example.ntbd.content.BranchContent;

/**
 * What is exported: an application's content (its pages, workflows and data), from a branch or from a
 * saved version.
 */
public record ExportScope(Long applicationId, String applicationName, BranchContent content) {
}
