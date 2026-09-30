package com.example.ntbd.export;

import com.example.ntbd.export.renderers.ButtonRenderer;
import com.example.ntbd.export.renderers.FallbackWidgetRenderer;
import com.example.ntbd.export.renderers.FormRenderer;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class WidgetHtmlRendererRegistryTest {

    @Test
    void resolves_renderers_by_each_of_their_types_and_falls_back_for_unknown_ones() {
        var form = new FormRenderer();
        var registry = new WidgetHtmlRendererRegistry(List.of(new ButtonRenderer(), form));

        assertThat(registry.getRenderer("input")).isSameAs(form);
        assertThat(registry.getRenderer("chart")).isInstanceOf(FallbackWidgetRenderer.class);
    }

    @Test
    void rejects_two_renderers_for_the_same_type() {
        assertThatThrownBy(() -> new WidgetHtmlRendererRegistry(List.of(new ButtonRenderer(), new ButtonRenderer())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("button");
    }
}
