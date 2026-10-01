package com.example.ntbd.service;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.dto.WidgetPropDefinitionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The settings of each widget type, from the widget catalog. */
@RequiredArgsConstructor
@Service
public class WidgetPropDefinitionService {

    /** The props that apply to every widget are listed under this type. */
    static final String GLOBAL_TYPE = "global";

    private final WidgetCatalog catalog;

    /** All definitions by widget type, 'global' first. */
    public Map<String, List<WidgetPropDefinitionDto>> getAllDefinitions() {
        Map<String, List<WidgetPropDefinitionDto>> all = new LinkedHashMap<>();
        all.put(GLOBAL_TYPE, getDefinitionsByType(GLOBAL_TYPE));
        catalog.widgets().forEach(w -> all.put(w.type(), getDefinitionsByType(w.type())));
        return all;
    }

    public List<WidgetPropDefinitionDto> getDefinitionsByType(String widgetType) {
        List<WidgetCatalogDocument.Prop> props = GLOBAL_TYPE.equals(widgetType)
                ? catalog.globalProps()
                : catalog.widget(widgetType).map(WidgetCatalogDocument.Widget::props).orElse(List.of());

        List<WidgetPropDefinitionDto> definitions = new ArrayList<>();
        for (int i = 0; i < props.size(); i++) {
            WidgetCatalogDocument.Prop p = props.get(i);
            // The catalog has no ids; a stable one per (type, position) is enough for clients
            long id = (long) widgetType.hashCode() * 1000 + i;
            definitions.add(new WidgetPropDefinitionDto(id, widgetType, p.key(), p.type(), p.defaultValue(),
                    p.label(), p.group(), p.options() != null ? p.options() : List.of()));
        }
        return definitions;
    }
}
