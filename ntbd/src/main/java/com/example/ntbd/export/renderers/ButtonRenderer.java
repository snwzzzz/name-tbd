package com.example.ntbd.export.renderers;

import com.example.ntbd.export.WidgetHtmlRenderer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

import static com.example.ntbd.export.WidgetHtml.cssColor;
import static com.example.ntbd.export.WidgetHtml.escapeHtml;
import static com.example.ntbd.export.WidgetHtml.prop;

@Component
public class ButtonRenderer implements WidgetHtmlRenderer {

    @Override
    public Set<String> widgetTypes() {
        return Set.of("button");
    }

    @Override
    public String render(String id, Map<String, Object> props) {
        return "<button type=\"button\" class=\"widget-button\" data-component-id=\"" + id + "\""
                + " style=\"background: " + escapeHtml(cssColor(prop(props, "color"), "#3b82f6")) + ";\">"
                + escapeHtml(prop(props, "label", "Button")) + "</button>";
    }
}
