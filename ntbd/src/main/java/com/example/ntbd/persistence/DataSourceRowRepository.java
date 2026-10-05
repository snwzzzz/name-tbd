package com.example.ntbd.persistence;

import com.example.ntbd.domain.DataSourceRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DataSourceRowRepository extends JpaRepository<DataSourceRow, Long> {

    @Query("select r from DataSourceRow r where r.id = :rowId and r.dataSource.id.id = :dataSourceId")
    Optional<DataSourceRow> findInSource(Long dataSourceId, Long rowId);

    @Query("select r from DataSourceRow r where r.id in :rowIds and r.dataSource.id.id = :dataSourceId")
    List<DataSourceRow> findAllInSource(Long dataSourceId, Collection<Long> rowIds);

    @Query("select coalesce(max(r.rowIndex), -1) from DataSourceRow r where r.dataSource.id.id = :dataSourceId")
    int maxRowIndex(Long dataSourceId);

    @Query("select count(r) from DataSourceRow r where r.dataSource.id.id = :dataSourceId")
    long countInSource(Long dataSourceId);
}
