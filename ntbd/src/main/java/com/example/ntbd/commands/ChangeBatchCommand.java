package com.example.ntbd.commands;

import java.util.List;

/** Changes to one branch, saved together: all of them or none (see ChangeOperation). */
public record ChangeBatchCommand(
        List<ChangeOperation> changes
) {
}
