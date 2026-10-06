package com.example.ntbd.persistence;

import com.example.ntbd.domain.Page;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/**
 * The branch a page, widget, workflow, node or edge belongs to (empty if there's no such thing), so a
 * batch of changes to one branch can't touch another's (ChangeBatchService). The "even if deleted"
 * ones are native, for restoring: the entities' restriction hides deleted rows from JPA queries.
 */
public interface BranchOwnershipRepository extends Repository<Page, Page.PageId> {

    @Query("select p.branch.id.id from Page p where p.id.id = :id")
    Optional<Long> branchOfPage(Long id);

    @Query("select c.page.branch.id.id from UiComponent c where c.id.id = :id")
    Optional<Long> branchOfWidget(Long id);

    @Query("select w.branch.id.id from Workflow w where w.id.id = :id")
    Optional<Long> branchOfWorkflow(Long id);

    @Query("select n.workflow.branch.id.id from Node n where n.id.id = :id")
    Optional<Long> branchOfNode(Long id);

    @Query("select e.sourceNode.workflow.branch.id.id from Edge e where e.id.id = :id")
    Optional<Long> branchOfEdge(Long id);

    @Query(value = "select p.branch_id from ui_component c join page p on p.id = c.page_id where c.id = :id", nativeQuery = true)
    Optional<Long> branchOfWidgetEvenIfDeleted(Long id);

    @Query(value = "select w.branch_id from node n join workflow w on w.id = n.workflow_id where n.id = :id", nativeQuery = true)
    Optional<Long> branchOfNodeEvenIfDeleted(Long id);

    @Query(value = """
            select w.branch_id from edge e join node n on n.id = e.source_node_id join workflow w on w.id = n.workflow_id
            where e.id = :id
            """, nativeQuery = true)
    Optional<Long> branchOfEdgeEvenIfDeleted(Long id);
}
