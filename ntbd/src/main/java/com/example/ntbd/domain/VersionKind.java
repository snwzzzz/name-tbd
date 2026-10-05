package com.example.ntbd.domain;

/** Why a version was made. */
public enum VersionKind {
    /** "Save version" in the editor. Always kept. */
    MANUAL,
    /** Every 30 minutes while the branch is edited. The newest 50 are kept. */
    AUTO,
    /** Before the app was exported. */
    BEFORE_EXPORT,
    /** What the branch was before a version was restored, so a restore can be taken back. Always kept. */
    RESTORE,
    /** Saved before versions were snapshots; can't be restored, and isn't listed. */
    LEGACY
}
