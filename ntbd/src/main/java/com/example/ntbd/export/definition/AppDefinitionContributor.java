package com.example.ntbd.export.definition;

/**
 * Adds a part of the app to its definition (e.g. its pages, or its data). Every contributor bean
 * is asked, in {@link org.springframework.core.annotation.Order} order; a new kind of thing in the
 * exported app (API connections, ...) is a new contributor, plus its frontend counterpart.
 */
public interface AppDefinitionContributor {

    void contribute(ExportScope scope, AppDefinition definition);
}
