package com.example.ntbd.commands;

import java.util.Map;

/**
 * Creates or changes a connection (or tries one out). {@code secret}: the credentials (e.g.
 * {@code {"password": "..."}}), encrypted when stored and never sent back; on a change, null keeps the
 * stored ones. Google and Microsoft connections are made by signing in instead (/api/connections/oauth).
 *
 * @param workspaceId the workspace it belongs to; or {@code branchId}: the workspace of that branch's app
 */
public record ConnectionCommand(
        Long workspaceId,
        Long branchId,
        String name,
        String kind,
        Map<String, Object> settings,
        Map<String, Object> secret
) {
}
