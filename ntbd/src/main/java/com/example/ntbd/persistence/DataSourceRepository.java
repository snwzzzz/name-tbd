package com.example.ntbd.persistence;

import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.DataSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataSourceRepository extends JpaRepository<DataSource, DataSource.DataSourceId> {
    List<DataSource> findByBranch_IdOrderByNameAsc(Branch.BranchId branchId);

    /**
     * Deletes a data source in one statement; the database cascades it to its columns, rows and
     * cells, so they aren't loaded just to be deleted.
     */
}
