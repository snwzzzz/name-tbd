package com.example.ntbd.workflow.sidecar;

import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContent.DataSourceContent;
import com.example.ntbd.content.BranchContent.PageContent;
import com.example.ntbd.content.BranchContent.WorkflowContent;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.livedata.LiveDataService;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;
import com.example.ntbd.persistence.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/**
 * Runs a workflow on the server, on the flow sidecar (the browser's engine): the flows that start
 * without a widget (page-load triggers), with the app's variables, the data, and a payload (as
 * {@code payload} in expressions and {@code event} for the flow). The answer is the sidecar's run log, steps
 * and variables.
 * <p>
 * Data: the flow gets every embedded data source, and the live ones it names (by id in its settings, or by
 * name in its expressions), read from their systems now; rows carry their ids. The sidecar answers with the
 * changes the flow made (add, update the changed columns, delete; by row id), and those are applied through
 * {@link LiveDataService}, like any app's changes, so changes others made meanwhile aren't overwritten.
 * <p>
 * Scheduled jobs and webhooks start flows the same way.
 */
@Service
@RequiredArgsConstructor
public class ServerFlowRunner {

    private final FlowSidecarClient sidecar;
    private final WorkflowRepository workflowRepository;
    private final BranchContentReader reader;
    private final LiveDataService liveData;
    private final TransactionTemplate transactions;

    private record Loaded(BranchContent content, WorkflowContent flow, Optional<PageContent> page) {
    }

    public Map<String, Object> run(Long workflowId, Map<String, Object> payload) {
        Loaded loaded = Objects.requireNonNull(transactions.execute(status -> {
            Workflow workflow = workflowRepository.findById(new Workflow.WorkflowId(workflowId))
                    .orElseThrow(() -> new WorkflowNotFoundException(workflowId));
            BranchContent content = reader.read(workflow.getBranch().getId().id());
            WorkflowContent flow = content.workflows().stream()
                    .filter(w -> w.id().equals(workflowId))
                    .findFirst()
                    .orElseThrow(() -> new WorkflowNotFoundException(workflowId));
            Optional<PageContent> page = content.pages().stream().filter(p -> p.id().equals(flow.pageId())).findFirst();
            return new Loaded(content, flow, page);
        }));
        BranchContent content = loaded.content();
        WorkflowContent flow = loaded.flow();
        Optional<PageContent> page = loaded.page();

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("workflow", Map.of("nodes", flow.nodes(), "edges", flow.edges()));
        request.put("pageId", page.map(p -> String.valueOf(p.id())).orElse("server"));
        request.put("variables", Map.of("app", content.variables(), "page", page.map(PageContent::variables).orElse(List.of())));
        request.put("data", data(content, flow));
        Map<String, Object> body = payload == null ? Map.of() : payload;
        request.put("scope", Map.of("payload", body));
        request.put("locals", Map.of("event", body));

        Map<String, Object> response = sidecar.run(request);
        Object changes = response.get("changes");
        if (changes instanceof List<?> list) apply(list);
        response.remove("data");
        response.remove("changes");
        return response;
    }

    /** The data sources the flow gets: every embedded one, and the live ones it names. */
    private List<Map<String, Object>> data(BranchContent content, WorkflowContent flow) {
        String text = String.valueOf(flow.nodes());
        List<Map<String, Object>> result = new ArrayList<>();
        for (DataSourceContent source : content.dataSources()) {
            if (source.isEmbedded()) {
                result.add(rows(source.id(), source.name(), source.columns(), source.rows(), source.rowIds()));
            } else if (text.contains(String.valueOf(source.id())) || text.contains(source.name())) {
                LiveRows rows = liveData.read(source.id());
                result.add(rows(source.id(), source.name(), rows.columns(),
                        rows.rows().stream().map(LiveRow::values).toList(), rows.rows().stream().map(LiveRow::id).toList()));
            }
        }
        return result;
    }

    private static Map<String, Object> rows(Long id, String name, List<String> columns, List<List<String>> rows, List<String> rowIds) {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("id", id);
        source.put("name", name);
        source.put("columns", columns);
        source.put("rows", rows);
        if (rowIds != null) source.put("rowIds", rowIds);
        return source;
    }

    /** Applies the flow's changes in order; rows it added get their real ids, which later changes use. */
    @SuppressWarnings("unchecked")
    private void apply(List<?> changes) {
        Map<String, String> added = new HashMap<>();
        for (Object item : changes) {
            if (!(item instanceof Map<?, ?> change)) continue;
            Long sourceId = ((Number) change.get("dataSourceId")).longValue();
            Map<String, String> values = change.get("values") instanceof Map<?, ?> map ? text((Map<String, Object>) map) : Map.of();
            switch (String.valueOf(change.get("op"))) {
                case "add" -> added.put(sourceId + ":" + change.get("rowId"), liveData.insert(sourceId, values).id());
                case "update" -> {
                    String rowId = real(added, sourceId, String.valueOf(change.get("rowId")));
                    try {
                        liveData.update(sourceId, rowId, values, null);
                    } catch (RowNotFoundException ignored) {
                        // Deleted by someone else meanwhile
                    }
                }
                case "delete" -> {
                    List<String> ids = change.get("rowIds") instanceof List<?> list
                            ? list.stream().map(id -> real(added, sourceId, String.valueOf(id))).toList() : List.of();
                    liveData.delete(sourceId, ids);
                }
                default -> { }
            }
        }
    }

    private static String real(Map<String, String> added, Long sourceId, String rowId) {
        return added.getOrDefault(sourceId + ":" + rowId, rowId);
    }

    private static Map<String, String> text(Map<String, Object> values) {
        Map<String, String> result = new LinkedHashMap<>();
        values.forEach((k, v) -> result.put(k, v == null ? "" : String.valueOf(v)));
        return result;
    }
}
