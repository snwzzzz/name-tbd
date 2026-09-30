package com.example.ntbd.export.renderers;

import com.example.ntbd.export.WidgetHtmlRenderer;

import java.util.Map;
import java.util.Set;

import static com.example.ntbd.export.WidgetHtml.escapeHtml;
import static com.example.ntbd.export.WidgetHtml.prop;

/** A plain box with the widget's text, for widget types without a renderer of their own. */
public class FallbackWidgetRenderer implements WidgetHtmlRenderer {

    @Override
    public Set<String> widgetTypes() {
        return Set.of();
    }

    @Override
    public String render(String id, Map<String, Object> props) {
        return "<div class=\"widget-text\">"
                + escapeHtml(prop(props, "text", prop(props, "label", "Widget"))) + "</div>";
    }
}
