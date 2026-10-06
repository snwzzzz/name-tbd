package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * The app's variables (section "variables"; each page's own are on the page, see PagesContributor).
 * The exported app starts each at its initial value (flow-engine/expressions/values.ts).
 */
@Component
@Order(400)
public class VariablesContributor implements AppDefinitionContributor {

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        definition.put("variables", scope.content().variables());
    }
}
