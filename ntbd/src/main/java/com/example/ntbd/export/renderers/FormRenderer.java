package com.example.ntbd.export.renderers;

import com.example.ntbd.export.WidgetHtmlRenderer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

import static com.example.ntbd.export.WidgetHtml.escapeHtml;
import static com.example.ntbd.export.WidgetHtml.prop;

@Component
public class FormRenderer implements WidgetHtmlRenderer {

    @Override
    public Set<String> widgetTypes() {
        return Set.of("form", "input");
    }

    @Override
    public String render(String id, Map<String, Object> props) {
        return "<div class=\"widget-form\"><input type=\"text\" placeholder=\""
                + escapeHtml(prop(props, "placeholder", "Enter text...")) + "\" /></div>";
    }
}
