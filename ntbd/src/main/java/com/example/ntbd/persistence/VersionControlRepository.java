package com.example.ntbd.persistence;

import com.example.ntbd.domain.VersionControl;
import com.example.ntbd.domain.VersionKind;
import com.example.ntbd.dto.VersionDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

/** Versions; listings leave the content (which can be large) out. */
public interface VersionControlRepository extends JpaRepository<VersionControl, VersionControl.VersionControlId> {

    /** A branch's versions, newest first, without legacy ones. */
    @Query("""
            select new com.example.ntbd.dto.VersionDto(v.id.id, v.number, v.kind, v.label, v.createdAt,
                trim(concat(coalesce(u.firstName, ''), ' ', coalesce(u.lastName, ''))), v.sizeBytes)
            from VersionControl v join v.modifiedBy u
            where v.branch.id.id = :branchId and v.kind <> com.example.ntbd.domain.VersionKind.LEGACY
            order by v.number desc
            """)
    List<VersionDto> listByBranch(Long branchId);

    @Query("""
            select new com.example.ntbd.dto.VersionDto(v.id.id, v.number, v.kind, v.label, v.createdAt,
                trim(concat(coalesce(u.firstName, ''), ' ', coalesce(u.lastName, ''))), v.sizeBytes)
            from VersionControl v join v.modifiedBy u
            where v.id.id = :id
            """)
    VersionDto summary(Long id);

    @Query("select coalesce(max(v.number), 0) from VersionControl v where v.branch.id.id = :branchId")
    int lastNumber(Long branchId);

    /** The hash of the branch's newest version (a list of at most one: none when it has no version). */
    @Query("select v.contentHash from VersionControl v where v.branch.id.id = :branchId order by v.number desc")
    List<String> latestHash(Long branchId, Pageable first);

    @Query("select max(v.createdAt) from VersionControl v where v.branch.id.id = :branchId and v.kind = :kind")
    LocalDateTime lastMadeAt(Long branchId, VersionKind kind);

    /** Ids of a branch's versions of a kind, newest first. */
    @Query("select v.id from VersionControl v where v.branch.id.id = :branchId and v.kind = :kind order by v.number desc")
    List<VersionControl.VersionControlId> idsOfKind(Long branchId, VersionKind kind);
}
