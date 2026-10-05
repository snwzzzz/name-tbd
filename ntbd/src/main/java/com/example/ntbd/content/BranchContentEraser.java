package com.example.ntbd.content;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Empties a branch: its pages (with their widgets and workflows), its other workflows and its data
 * sources, soft-deleted ones included. The database cascades the rest (V1_0_19). Versions stay.
 * Call within a transaction; afterwards, entities loaded before are detached.
 */
@RequiredArgsConstructor
@Component
public class BranchContentEraser {

    private final EntityManager entityManager;

    public void erase(Long branchId) {
        entityManager.flush();
        for (String table : new String[]{"page", "workflow", "data_source"}) {
            entityManager.createNativeQuery("delete from \"" + table + "\" where branch_id = :branchId")
                    .setParameter("branchId", branchId)
                    .executeUpdate();
        }
        entityManager.clear();
    }
}
