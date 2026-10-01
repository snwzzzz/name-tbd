package com.example.ntbd.export.format;

import com.example.ntbd.export.definition.AppDefinition;

/**
 * A way to package an exported app (one HTML file, a ZIP for a hosting vendor, ...). Every format
 * bean is offered under its {@link #id()}; a new one is just another bean.
 */
public interface ExportFormat {

    /** How clients ask for this format (e.g. {@code ?format=html}). */
    String id();

    ExportedFile export(AppDefinition definition);
}
