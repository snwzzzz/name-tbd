package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "\"widget_prop_definition\"")
public class WidgetPropDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "widget_type", nullable = false)
    private String widgetType; // e.g., "button", "label", "global"

    @Column(name = "prop_key", nullable = false)
    private String propKey; // e.g., "color", "label", "text"

    @Column(name = "prop_type", nullable = false)
    private String propType; // e.g., "string", "number", "color", "boolean"

    @Column(name = "default_value")
    private String defaultValue;

    /** Shown in the properties panel instead of the prop key. */
    @Column(name = "label")
    private String label;

    /** The heading the prop is listed under in the properties panel (none: listed first). */
    @Column(name = "prop_group")
    private String group;

    /** A definition without label or group (shown under its key, ungrouped). */
    public WidgetPropDefinition(Long id, String widgetType, String propKey, String propType, String defaultValue) {
        this(id, widgetType, propKey, propType, defaultValue, null, null);
    }
}
