package com.example.ntbd.persistence;

import com.example.ntbd.domain.DataConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DataConnectionRepository extends JpaRepository<DataConnection, Long> {

    @Query("select c from DataConnection c where c.workspace.id.id = :workspaceId order by c.name, c.id")
    List<DataConnection> findByWorkspaceId(Long workspaceId);
}
