package com.example.ntbd.persistence;

import com.example.ntbd.domain.User;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.domain.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMember.WorkspaceMemberId> {

    /** The user's memberships with their workspaces, personal workspace first. */
    @Query("""
            select m from WorkspaceMember m join fetch m.workspace w
            where m.user.id = :userId
            order by w.personal desc, w.name, w.id.id
            """)
    List<WorkspaceMember> findByUserWithWorkspace(User.UserId userId);

    boolean existsByWorkspace_IdAndUser_Id(Workspace.WorkspaceId workspaceId, User.UserId userId);
}
