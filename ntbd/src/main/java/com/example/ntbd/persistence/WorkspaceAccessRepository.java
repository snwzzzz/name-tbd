package com.example.ntbd.persistence;

import com.example.ntbd.domain.WorkspaceMember;
import com.example.ntbd.domain.WorkspaceRole;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

/**
 * A user's role in the workspace a resource belongs to: each query walks from the resource up to its
 * application's workspace. Empty when the resource doesn't exist or the user isn't a member there.
 */
public interface WorkspaceAccessRepository extends Repository<WorkspaceMember, WorkspaceMember.WorkspaceMemberId> {

    @Query("select m.workspace.id.id from WorkspaceMember m where m.user.id.id = :userId")
    List<Long> workspaceIdsOf(Long userId);

    @Query("""
            select m.role from WorkspaceMember m
            where m.workspace.id.id = :workspaceId and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleInWorkspace(Long workspaceId, Long userId);

    @Query("""
            select m.role from Application a, WorkspaceMember m
            where a.id.id = :applicationId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForApplication(Long applicationId, Long userId);

    @Query("""
            select m.role from Branch b join b.application a, WorkspaceMember m
            where b.id.id = :branchId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForBranch(Long branchId, Long userId);

    @Query("""
            select m.role from Page p join p.branch b join b.application a, WorkspaceMember m
            where p.id.id = :pageId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForPage(Long pageId, Long userId);

    @Query("""
            select m.role from UiComponent c join c.page p join p.branch b join b.application a, WorkspaceMember m
            where c.id.id = :componentId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForUiComponent(Long componentId, Long userId);

    /** Workflows without a branch belong to nobody (there are none since workflows require one). */
    @Query("""
            select m.role from Workflow w join w.branch b join b.application a, WorkspaceMember m
            where w.id.id = :workflowId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForWorkflow(Long workflowId, Long userId);

    @Query("""
            select m.role from Node n join n.workflow w join w.branch b join b.application a, WorkspaceMember m
            where n.id.id = :nodeId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForNode(Long nodeId, Long userId);

    @Query("""
            select m.role from Edge e join e.sourceNode n join n.workflow w join w.branch b join b.application a,
                WorkspaceMember m
            where e.id.id = :edgeId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForEdge(Long edgeId, Long userId);

    @Query("""
            select m.role from DataSource d join d.branch b join b.application a, WorkspaceMember m
            where d.id.id = :dataSourceId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<WorkspaceRole> roleForDataSource(Long dataSourceId, Long userId);
}
