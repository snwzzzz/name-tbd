package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.Collection;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Application.ApplicationId> {

    @Query("select a from Application a where a.workspace.id.id in :workspaceIds order by a.title, a.id.id")
    List<Application> findByWorkspaceIds(Collection<Long> workspaceIds);

    /** Notes a change to the application (or anything in it) by user {@code userId}, at {@code at} (UTC). */
    @Transactional
    @Modifying
    @Query(value = "update \"application\" set last_modified = :at, last_modified_by_id = :userId where id = :applicationId",
            nativeQuery = true)
    void touch(Long applicationId, Long userId, LocalDateTime at);

    /** Deletes the application; the database deletes its branches and everything in them (V1_0_19). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Application a where a.id.id = :applicationId")
    int deleteWithEverything(Long applicationId);
}
