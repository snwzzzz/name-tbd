package com.example.ntbd.dto;

import java.util.Map;

/**
 * A connection as the editor sees it: never its secret, only whether it has one.
 *
 * @param settings what it connects to, without secrets (host, base URL, the signed-in account, ...)
 */
public record ConnectionDto(
        Long id,
        Long workspaceId,
        String name,
        String kind,
        Map<String, Object> settings,
        boolean hasSecret
) {
}
