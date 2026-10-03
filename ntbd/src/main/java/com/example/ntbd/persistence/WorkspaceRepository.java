package com.example.ntbd.persistence;

import com.example.ntbd.domain.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepository extends JpaRepository<Workspace, Workspace.WorkspaceId> {
}
