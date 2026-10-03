package com.example.ntbd.persistence;

import com.example.ntbd.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Application.ApplicationId> {

    @Query("select a from Application a where a.workspace.id.id in :workspaceIds order by a.title, a.id.id")
    List<Application> findByWorkspaceIds(Collection<Long> workspaceIds);
}
