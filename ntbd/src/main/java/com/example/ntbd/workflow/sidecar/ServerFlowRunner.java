package com.example.ntbd.workflow.sidecar;

import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContent.DataSourceContent;
import com.example.ntbd.content.BranchContent.PageContent;
import com.example.ntbd.content.BranchContent.WorkflowContent;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.persistence.WorkflowRepository;
import com.example.ntbd.service.DataSourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Runs a workflow on the server, on the flow sidecar (the browser's engine): the flows that start
 * without a widget (page-load triggers), with the app's variables, the data, and a payload (as
 * {@code payload} in expressions and {@code event} for the flow). Rows the flow changed are written
 * back; the answer is the sidecar's run log, steps and variables.
 * <p>
 * Scheduled jobs and webhooks start flows the same way.
 */
@Service
@RequiredArgsConstructor
public class ServerFlowRunner {

    private final FlowSidecarClient sidecar;
    private final WorkflowRepository workflowRepository;
    private final BranchContentReader reader;
    private final DataSourceService dataSources;

    @Transactional
    public Map<String, Object> run(Long workflowId, Map<String, Object> payload) {
        Workflow workflow = workflowRepository.findById(new Workflow.WorkflowId(workflowId))
                .orElseThrow(() -> new WorkflowNotFoundException(workflowId));
        BranchContent content = reader.read(workflow.getBranch().getId().id());
        WorkflowContent flow = content.workflows().stream()
                .filter(w -> w.id().equals(workflowId))
                .findFirst()
                .orElseThrow(() -> new WorkflowNotFoundException(workflowId));
        Optional<PageContent> page = content.pages().stream().filter(p -> p.id().equals(flow.pageId())).findFirst();

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("workflow", Map.of("nodes", flow.nodes(), "edges", flow.edges()));
        request.put("pageId", page.map(p -> String.valueOf(p.id())).orElse("server"));
        request.put("variables", Map.of("app", content.variables(), "page", page.map(PageContent::variables).orElse(List.of())));
        request.put("data", content.dataSources().stream().map(ServerFlowRunner::rows).toList());
        Map<String, Object> body = payload == null ? Map.of() : payload;
        request.put("scope", Map.of("payload", body));
        request.put("locals", Map.of("event", body));

        Map<String, Object> response = sidecar.run(request);
        writeBack(content.dataSources(), response.get("data"));
        response.remove("data");
        return response;
    }

    private static Map<String, Object> rows(DataSourceContent source) {
        Map<String, Object> rows = new LinkedHashMap<>();
        rows.put("id", source.id());
        rows.put("name", source.name());
        rows.put("columns", source.columns());
        rows.put("rows", source.rows());
        return rows;
    }

    /** Replaces the rows of the data sources the flow changed. */
    @SuppressWarnings("unchecked")
    private void writeBack(List<DataSourceContent> before, Object after) {
        if (!(after instanceof List<?> sources)) return;
        for (Object item : sources) {
            if (!(item instanceof Map<?, ?> source)) continue;
            Long id = ((Number) source.get("id")).longValue();
            List<List<String>> rows = (List<List<String>>) source.get("rows");
            before.stream()
                    .filter(b -> b.id().equals(id) && !b.rows().equals(rows))
                    .findFirst()
                    .ifPresent(b -> dataSources.replaceRows(id, rows));
        }
    }
}
