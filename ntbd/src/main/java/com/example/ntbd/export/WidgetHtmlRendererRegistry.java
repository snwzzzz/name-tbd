package com.example.ntbd.export;

import com.example.ntbd.export.renderers.FallbackWidgetRenderer;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class WidgetHtmlRendererRegistry {

    private static final WidgetHtmlRenderer FALLBACK = new FallbackWidgetRenderer();

    private final List<WidgetHtmlRenderer> renderers;
    private final Map<String, WidgetHtmlRenderer> byType = new HashMap<>();

    public WidgetHtmlRendererRegistry(List<WidgetHtmlRenderer> renderers) {
        this.renderers = List.copyOf(renderers);
        for (WidgetHtmlRenderer renderer : renderers) {
            for (String type : renderer.widgetTypes()) {
                if (byType.putIfAbsent(type, renderer) != null) {
                    throw new IllegalStateException("Two export renderers for widget type: " + type);
                }
            }
        }
    }

    /** The renderer for a widget type; unknown types get a plain placeholder. */
    public WidgetHtmlRenderer getRenderer(String type) {
        return byType.getOrDefault(type, FALLBACK);
    }

    /** The CSS of all renderers, for the exported page. */
    public String styles() {
        return renderers.stream()
                .map(WidgetHtmlRenderer::styles)
                .filter(css -> !css.isBlank())
                .collect(Collectors.joining("\n"));
    }
}
