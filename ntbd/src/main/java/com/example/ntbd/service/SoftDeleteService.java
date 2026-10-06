package com.example.ntbd.service;

import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.Exception.EdgeNotFoundException;
import com.example.ntbd.Exception.NodeNotFoundException;
import com.example.ntbd.Exception.UiComponentNotFoundException;
import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.persistence.SoftDeleteRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Deleting that can be undone. A deletion only marks rows (deleted_at); every row deleted together
 * gets the same time, and restoring brings back exactly those rows, with the same ids, so everything
 * that points at them (children, workflow nodes, data source props) works again. Rows deleted
 * separately before stay deleted. {@link SoftDeletePurge} removes marked rows for good after a while.
 * <ul>
 *   <li>A widget is deleted with everything inside it (a container's widgets).</li>
 *   <li>A workflow node is deleted with its edges; restoring it brings back those whose other node exists.</li>
 * </ul>
 * Callers check access first (WorkspaceAccess); restoring something that isn't deleted does nothing.
 */
@RequiredArgsConstructor
@Service
public class SoftDeleteService {

    private final SoftDeleteRepository repository;

    @Transactional
    public void deleteWidget(Long id) {
        List<Long> subtree = new ArrayList<>(List.of(id));
        List<Long> level = List.of(id);
        while (!level.isEmpty()) {
            level = repository.liveChildIds(level);
            subtree.addAll(level);
        }
        if (repository.markWidgets(subtree, now()) == 0) {
            throw new UiComponentNotFoundException("UI Component not found with id " + id);
        }
    }

    @Transactional
    public void restoreWidget(Long id) {
        Optional<LocalDateTime> deletedAt = repository.widgetDeletedAt(id);
        if (deletedAt.isEmpty()) return;
        if (repository.countDeletedParents(id) > 0) {
            throw new IllegalArgumentException("The container this widget was in is deleted; restore that first");
        }
        List<Long> subtree = new ArrayList<>(List.of(id));
        List<Long> level = List.of(id);
        while (!level.isEmpty()) {
            level = repository.childIdsDeletedAt(level, deletedAt.get());
            subtree.addAll(level);
        }
        repository.unmarkWidgets(subtree);
    }

    @Transactional
    public void deleteNode(Long id) {
        LocalDateTime at = now();
        if (repository.markNode(id, at) == 0) throw new NodeNotFoundException(id);
        repository.markEdgesOfNode(id, at);
    }

    @Transactional
    public void restoreNode(Long id) {
        Optional<LocalDateTime> deletedAt = repository.nodeDeletedAt(id);
        if (deletedAt.isEmpty()) return;
        repository.unmarkNode(id);
        repository.unmarkEdgesOfNode(id, deletedAt.get());
    }

    @Transactional
    public void deleteEdge(Long id) {
        if (repository.markEdge(id, now()) == 0) throw new EdgeNotFoundException(id);
    }

    @Transactional
    public void restoreEdge(Long id) {
        if (repository.countDeletedEdge(id) == 0) return;
        if (repository.unmarkEdge(id) == 0) {
            throw new IllegalArgumentException("A node this connection joins is deleted; restore it first");
        }
    }

    @Transactional
    public void deleteDataSource(Long id) {
        if (repository.markDataSource(id, now()) == 0) throw new DataSourceNotFoundException(id);
    }

    @Transactional
    public void restoreDataSource(Long id) {
        repository.unmarkDataSource(id);
    }

    /** Removes for good what was deleted before {@code before}; it can't be restored after that. */
    @Transactional
    public int purgeDeletedBefore(LocalDateTime before) {
        return repository.purgeEdges(before) + repository.purgeNodes(before)
                + repository.purgeWidgets(before) + repository.purgeDataSources(before);
    }

    /** Microseconds, as the column stores them, so rows deleted together compare equal. */
    private static LocalDateTime now() {
        return Timestamps.nowUtc().truncatedTo(ChronoUnit.MICROS);
    }
}
