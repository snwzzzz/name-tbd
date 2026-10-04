package com.example.ntbd.persistence;

import com.example.ntbd.domain.UiComponent;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Marking rows deleted, bringing them back, and removing them for good (SoftDeleteService). Native SQL,
 * because the entities' restriction hides deleted rows from every JPA query.
 */
public interface SoftDeleteRepository extends Repository<UiComponent, UiComponent.UiComponentId> {

    // ---- Widgets ----

    @Query(value = "select id from ui_component where parent_id in (:parentIds) and deleted_at is null", nativeQuery = true)
    List<Long> liveChildIds(Collection<Long> parentIds);

    @Query(value = "select id from ui_component where parent_id in (:parentIds) and deleted_at = :at", nativeQuery = true)
    List<Long> childIdsDeletedAt(Collection<Long> parentIds, LocalDateTime at);

    @Query(value = "select deleted_at from ui_component where id = :id and deleted_at is not null", nativeQuery = true)
    Optional<LocalDateTime> widgetDeletedAt(Long id);

    /** Whether the widget's container (if it has one) is deleted. */
    @Query(value = """
            select count(*) from ui_component c join ui_component parent on parent.id = c.parent_id
            where c.id = :id and parent.deleted_at is not null
            """, nativeQuery = true)
    long countDeletedParents(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update ui_component set deleted_at = :at where id in (:ids) and deleted_at is null", nativeQuery = true)
    int markWidgets(Collection<Long> ids, LocalDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update ui_component set deleted_at = null where id in (:ids)", nativeQuery = true)
    int unmarkWidgets(Collection<Long> ids);

    // ---- Workflow nodes and edges ----

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update node set deleted_at = :at where id = :id and deleted_at is null", nativeQuery = true)
    int markNode(Long id, LocalDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            update edge set deleted_at = :at
            where (source_node_id = :nodeId or target_node_id = :nodeId) and deleted_at is null
            """, nativeQuery = true)
    int markEdgesOfNode(Long nodeId, LocalDateTime at);

    @Query(value = "select deleted_at from node where id = :id and deleted_at is not null", nativeQuery = true)
    Optional<LocalDateTime> nodeDeletedAt(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update node set deleted_at = null where id = :id", nativeQuery = true)
    int unmarkNode(Long id);

    /** The node's edges deleted along with it, as long as the node at their other end exists. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            update edge set deleted_at = null
            where (source_node_id = :nodeId or target_node_id = :nodeId) and deleted_at = :at
              and source_node_id in (select id from node where deleted_at is null)
              and target_node_id in (select id from node where deleted_at is null)
            """, nativeQuery = true)
    int unmarkEdgesOfNode(Long nodeId, LocalDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update edge set deleted_at = :at where id = :id and deleted_at is null", nativeQuery = true)
    int markEdge(Long id, LocalDateTime at);

    @Query(value = "select count(*) from edge where id = :id and deleted_at is not null", nativeQuery = true)
    long countDeletedEdge(Long id);

    /** The edge, if both its nodes exist. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            update edge set deleted_at = null
            where id = :id
              and source_node_id in (select id from node where deleted_at is null)
              and target_node_id in (select id from node where deleted_at is null)
            """, nativeQuery = true)
    int unmarkEdge(Long id);

    // ---- Data sources ----

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update data_source set deleted_at = :at where id = :id and deleted_at is null", nativeQuery = true)
    int markDataSource(Long id, LocalDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "update data_source set deleted_at = null where id = :id", nativeQuery = true)
    int unmarkDataSource(Long id);

    // ---- Removing for good (the database deletes what depends on a row: props, children, edges, rows) ----

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from edge where deleted_at < :before", nativeQuery = true)
    int purgeEdges(LocalDateTime before);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from node where deleted_at < :before", nativeQuery = true)
    int purgeNodes(LocalDateTime before);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from ui_component where deleted_at < :before", nativeQuery = true)
    int purgeWidgets(LocalDateTime before);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "delete from data_source where deleted_at < :before", nativeQuery = true)
    int purgeDataSources(LocalDateTime before);
}
