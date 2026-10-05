package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.AppTheme;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import com.example.ntbd.persistence.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * The app's theme (section "theme"): as the application has it now, also when a saved version is
 * exported (themes aren't part of versions). Null: the default preset. The exported app turns it
 * into the widgets' CSS variables (core/rendering/app-theme.ts).
 */
@Component
@Order(300)
@RequiredArgsConstructor
public class ThemeContributor implements AppDefinitionContributor {

    private final ApplicationRepository applications;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        AppTheme theme = scope.applicationId() == null ? null : applications
                .findById(new Application.ApplicationId(scope.applicationId()))
                .map(Application::getTheme)
                .orElse(null);
        definition.put("theme", theme);
    }
}
