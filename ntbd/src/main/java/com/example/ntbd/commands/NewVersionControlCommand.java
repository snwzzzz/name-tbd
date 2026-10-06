package com.example.ntbd.commands;

/** Save branch {@code branchId} as it is now as a version, optionally named; the signed-in user is its author. */
public record NewVersionControlCommand(Long branchId, String label) {
}
