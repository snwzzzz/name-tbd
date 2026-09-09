package com.example.ntbd.persistence;

import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.VersionControl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface VersionControlRepository extends JpaRepository<VersionControl, VersionControl.VersionControlId> {

    @Query("""
    SELECT vc
    FROM VersionControl vc
    WHERE vc.branch.id = :branchId
    ORDER BY vc.timestamp DESC
    """)
    List<VersionControl> findVersionControlByBranchOrderByTimestamp(
            Long branchId,
            Pageable pageable
    );
}
