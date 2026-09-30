package com.example.ntbd.export;

import java.util.Map;
import java.util.Set;

/**
 * Renders one kind of widget for the HTML export. Support for another widget type is added by
 * registering another implementation as a bean; {@link WidgetHtmlRendererRegistry} picks it up.
 */
public interface WidgetHtmlRenderer {

    /** The widget types this renderer draws, e.g. "button". */
    Set<String> widgetTypes();

    /**
     * The widget's HTML, placed inside its grid cell. Every prop value must be escaped
     * (see {@link WidgetHtml}).
     *
     * @param id    the component id
     * @param props the component's stored props (keys missing when never set)
     */
    String render(String id, Map<String, Object> props);

    /** CSS this renderer's HTML needs, added to the page once. */
    default String styles() {
        return "";
    }
}
