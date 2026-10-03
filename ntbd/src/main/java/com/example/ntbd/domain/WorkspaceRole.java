package com.example.ntbd.domain;

/** What a member may do in a workspace. Each role includes everything the ones after it may do. */
public enum WorkspaceRole {
    /** Manages members and deletes the workspace. */
    OWNER,
    /** Creates, edits and deletes applications. */
    EDITOR,
    /** Opens and exports applications. */
    VIEWER;

    public boolean includes(WorkspaceRole other) {
        return ordinal() <= other.ordinal();
    }
}
