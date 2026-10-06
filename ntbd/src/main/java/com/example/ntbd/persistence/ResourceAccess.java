package com.example.ntbd.persistence;

import com.example.ntbd.domain.WorkspaceRole;

/** A user's role in the workspace of a resource, and the application the resource belongs to. */
public record ResourceAccess(WorkspaceRole role, Long applicationId) {
}
