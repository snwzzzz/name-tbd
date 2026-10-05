package com.example.ntbd.persistence;

import com.example.ntbd.domain.WorkspaceMember;
import com.example.ntbd.domain.WorkspaceRole;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

/**
 * A user's role in the workspace a resource belongs to (and the resource's application): each query
 * walks from the resource up to its application's workspace. Empty when the resource doesn't exist
 * or the user isn't a member there.
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
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Application a, WorkspaceMember m
            where a.id.id = :applicationId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForApplication(Long applicationId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Branch b join b.application a, WorkspaceMember m
            where b.id.id = :branchId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForBranch(Long branchId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Page p join p.branch b join b.application a, WorkspaceMember m
            where p.id.id = :pageId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForPage(Long pageId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from UiComponent c join c.page p join p.branch b join b.application a, WorkspaceMember m
            where c.id.id = :componentId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForUiComponent(Long componentId, Long userId);

    /** A role and application from a native query (aliases quoted, so every database keeps their case). */
    interface AccessRow {
        String getRole();

        Long getApplicationId();
    }

    String WIDGET_EVEN_IF_DELETED = """
            select m.role as "role", a.id as "applicationId"
            from ui_component c join page p on p.id = c.page_id join branch b on b.id = p.branch_id
                join "application" a on a.id = b.application_id join workspace_member m on m.workspace_id = a.workspace_id
            where c.id = :id and m.user_id = :userId
            """;

    /** Like roleForUiComponent, also for a deleted widget (to restore it). */
    @Query(value = WIDGET_EVEN_IF_DELETED, nativeQuery = true)
    Optional<AccessRow> accessToUiComponentEvenIfDeleted(Long id, Long userId);

    @Query(value = """
            select m.role as "role", a.id as "applicationId"
            from node n join workflow w on w.id = n.workflow_id join branch b on b.id = w.branch_id
                join "application" a on a.id = b.application_id join workspace_member m on m.workspace_id = a.workspace_id
            where n.id = :id and m.user_id = :userId
            """, nativeQuery = true)
    Optional<AccessRow> accessToNodeEvenIfDeleted(Long id, Long userId);

    @Query(value = """
            select m.role as "role", a.id as "applicationId"
            from edge e join node n on n.id = e.source_node_id join workflow w on w.id = n.workflow_id
                join branch b on b.id = w.branch_id join "application" a on a.id = b.application_id
                join workspace_member m on m.workspace_id = a.workspace_id
            where e.id = :id and m.user_id = :userId
            """, nativeQuery = true)
    Optional<AccessRow> accessToEdgeEvenIfDeleted(Long id, Long userId);

    @Query(value = """
            select m.role as "role", a.id as "applicationId"
            from data_source d join branch b on b.id = d.branch_id join "application" a on a.id = b.application_id
                join workspace_member m on m.workspace_id = a.workspace_id
            where d.id = :id and m.user_id = :userId
            """, nativeQuery = true)
    Optional<AccessRow> accessToDataSourceEvenIfDeleted(Long id, Long userId);

    /** Workflows without a branch belong to nobody (there are none since workflows require one). */
    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Workflow w join w.branch b join b.application a, WorkspaceMember m
            where w.id.id = :workflowId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForWorkflow(Long workflowId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Node n join n.workflow w join w.branch b join b.application a, WorkspaceMember m
            where n.id.id = :nodeId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForNode(Long nodeId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from Edge e join e.sourceNode n join n.workflow w join w.branch b join b.application a,
                WorkspaceMember m
            where e.id.id = :edgeId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForEdge(Long edgeId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from DataSource d join d.branch b join b.application a, WorkspaceMember m
            where d.id.id = :dataSourceId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForDataSource(Long dataSourceId, Long userId);

    @Query("""
            select new com.example.ntbd.persistence.ResourceAccess(m.role, a.id.id) from VersionControl v join v.branch b join b.application a, WorkspaceMember m
            where v.id.id = :versionId and m.workspace = a.workspace and m.user.id.id = :userId
            """)
    Optional<ResourceAccess> roleForVersion(Long versionId, Long userId);
}
