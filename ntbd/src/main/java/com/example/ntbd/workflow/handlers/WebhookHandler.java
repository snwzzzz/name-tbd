package com.example.ntbd.workflow.handlers;

import com.example.ntbd.domain.Node;
import com.example.ntbd.workflow.ExecutionResult;
import com.example.ntbd.workflow.FlowContext;
import com.example.ntbd.workflow.NodeHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class WebhookHandler implements NodeHandler {

    @Override
    public String nodeType() {
        return "WEBHOOK";
    }

    @Override
    public ExecutionResult handle(Node node, FlowContext context) {
        Map<String, Object> props = node.getProps();
        if (props == null) {
            return ExecutionResult.failure("Missing properties for WEBHOOK node");
        }

        String url = (String) props.get("url");
        String method = (String) props.getOrDefault("method", "POST");
        Object body = props.get("body");

        if (url == null) {
            return ExecutionResult.failure("Missing url for WEBHOOK node");
        }

        try {
            // In a real implementation, you would use RestTemplate or WebClient here to make the actual call
            // For now, we simulate success
            Map<String, Object> responseData = Map.of("status", 200, "message", "Simulated webhook success");
            return ExecutionResult.success("output_success", responseData);
        } catch (Exception e) {
            return ExecutionResult.failure("Webhook failed: " + e.getMessage());
        }
    }
}
