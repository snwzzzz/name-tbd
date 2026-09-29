package com.example.ntbd.workflow.handlers;

import com.example.ntbd.domain.Node;
import com.example.ntbd.workflow.ExecutionResult;
import com.example.ntbd.workflow.FlowContext;
import com.example.ntbd.workflow.NodeHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class EmailHandler implements NodeHandler {

    @Override
    public String nodeType() {
        return "EMAIL";
    }

    @Override
    public ExecutionResult handle(Node node, FlowContext context) {
        Map<String, Object> props = node.getProps();
        if (props == null) {
            return ExecutionResult.failure("Missing properties for EMAIL node");
        }

        String to = (String) props.get("to");
        String subject = (String) props.get("subject");
        Object body = props.get("body");

        if (to == null || to.isBlank()) {
            return ExecutionResult.failure("Missing 'to' address for EMAIL node");
        }
        if (subject == null || subject.isBlank()) {
            return ExecutionResult.failure("Missing 'subject' for EMAIL node");
        }

        // In a real implementation, inject JavaMailSender or similar and send the email.
        // For now, simulate success and surface the resolved fields in outputData.
        Map<String, Object> outputData = Map.of(
                "to", to,
                "subject", subject,
                "sent", true
        );
        return ExecutionResult.success("output_success", outputData);
    }
}
