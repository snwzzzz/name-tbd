package com.example.ntbd.export.renderers;

import com.example.ntbd.export.WidgetHtmlRenderer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

import static com.example.ntbd.export.WidgetHtml.cssColor;
import static com.example.ntbd.export.WidgetHtml.escapeHtml;
import static com.example.ntbd.export.WidgetHtml.prop;

@Component
public class LabelRenderer implements WidgetHtmlRenderer {

    @Override
    public Set<String> widgetTypes() {
        return Set.of("label");
    }

    @Override
    public String render(String id, Map<String, Object> props) {
        String color = cssColor(prop(props, "color"), null);
        return "<div class=\"widget-label\" data-component-id=\"" + id + "\""
                + (color != null ? " style=\"color: " + escapeHtml(color) + ";\"" : "") + ">"
                + "<span class=\"widget-label-text\">" + escapeHtml(prop(props, "text", "New Label")) + "</span></div>";
    }
}
