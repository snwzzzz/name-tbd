package com.example.ntbd.auth;

import com.example.ntbd.Exception.*;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.persistence.WorkspaceAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Supplier;

/**
 * Whether the signed-in user may use a resource, by their role in the workspace it belongs to.
 * Every controller method asks here first ({@code require...(id, role)}):
 * <ul>
 *   <li>Not a member of that workspace, or no such resource: the resource's NotFoundException (404),
 *       so other workspaces' data can't even be detected.</li>
 *   <li>A member whose role is below {@code least}: {@link ForbiddenException} (403).</li>
 * </ul>
 * Reads need {@link WorkspaceRole#VIEWER}, changes {@link WorkspaceRole#EDITOR}.
 */
@RequiredArgsConstructor
@Component
public class WorkspaceAccess {

    private final WorkspaceAccessRepository repository;
    private final CurrentUser currentUser;

    /** The workspaces the user is a member of. */
    public List<Long> workspaceIds() {
        return repository.workspaceIdsOf(currentUser.requireId().id());
    }

    public void requireWorkspace(Long id, WorkspaceRole least) {
        require("workspaceId", id, least, repository::roleInWorkspace, () -> new WorkspaceNotFoundException(id));
    }

    public void requireApplication(Long id, WorkspaceRole least) {
        require("applicationId", id, least, repository::roleForApplication, () -> new ApplicationNotFoundException(id));
    }

    public void requireBranch(Long id, WorkspaceRole least) {
        require("branchId", id, least, repository::roleForBranch, () -> new BranchNotFoundException(id));
    }

    public void requirePage(Long id, WorkspaceRole least) {
        require("pageId", id, least, repository::roleForPage,
                () -> new PageNotFoundException("Page not found with id: " + id));
    }

    public void requireUiComponent(Long id, WorkspaceRole least) {
        require("componentId", id, least, repository::roleForUiComponent,
                () -> new UiComponentNotFoundException("UI Component not found with id " + id));
    }

    public void requireWorkflow(Long id, WorkspaceRole least) {
        require("workflowId", id, least, repository::roleForWorkflow, () -> new WorkflowNotFoundException(id));
    }

    public void requireNode(Long id, WorkspaceRole least) {
        require("nodeId", id, least, repository::roleForNode, () -> new NodeNotFoundException(id));
    }

    public void requireEdge(Long id, WorkspaceRole least) {
        require("edgeId", id, least, repository::roleForEdge, () -> new EdgeNotFoundException(id));
    }

    public void requireDataSource(Long id, WorkspaceRole least) {
        require("dataSourceId", id, least, repository::roleForDataSource, () -> new DataSourceNotFoundException(id));
    }

    private void require(String name, Long id, WorkspaceRole least,
                         BiFunction<Long, Long, Optional<WorkspaceRole>> roleOf,
                         Supplier<? extends ResourceNotFoundException> notFound) {
        if (id == null) {
            throw new IllegalArgumentException(name + " is required");
        }
        WorkspaceRole role = roleOf.apply(id, currentUser.requireId().id()).orElseThrow(notFound);
        if (!role.includes(least)) {
            throw new ForbiddenException("Your role in this workspace (" + role.name().toLowerCase()
                    + ") doesn't allow this");
        }
    }
}
