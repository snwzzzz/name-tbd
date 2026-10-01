package com.example.ntbd.export.format;

import com.example.ntbd.Exception.ExportRuntimeUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The exported app's runtime: the frontend's "runtime" build (index.html, main.js, styles.css),
 * which runs any app definition. Built by {@code npm run build:runtime} (and {@code npm start}).
 * <p>
 * It's looked for in each of {@code ntbd.export.runtime-locations} in turn: while developing, the
 * build output on disk (so a new build is used right away, without restarting the backend);
 * otherwise its copy on the classpath.
 */
@Component
public class ExportRuntime {

    private static final String DEFAULT_LOCATIONS = "file:src/main/resources/export-runtime/,"
            + "file:ntbd/src/main/resources/export-runtime/,"
            + "classpath:export-runtime/";

    private final ResourceLoader resourceLoader;
    private final List<String> locations;

    public ExportRuntime(ResourceLoader resourceLoader,
                         @Value("${ntbd.export.runtime-locations:" + DEFAULT_LOCATIONS + "}") List<String> locations) {
        this.resourceLoader = resourceLoader;
        this.locations = locations.stream().map(String::trim).map(l -> l.endsWith("/") ? l : l + "/").toList();
    }

    /** One of the runtime's files, as text, from the first location that has the runtime. */
    public String file(String name) {
        String location = location();
        try {
            return resourceLoader.getResource(location + name).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ExportRuntimeUnavailableException("The app runtime's " + name + " (at " + location + ") could not be read", e);
        }
    }

    // Looked up on every export, so a runtime built while the backend runs is used right away
    private String location() {
        return locations.stream()
                .filter(location -> resourceLoader.getResource(location + "index.html").exists())
                .findFirst()
                .orElseThrow(() -> new ExportRuntimeUnavailableException("The app runtime isn't built (looked in "
                        + String.join(", ", locations) + "); build it with `npm run build:runtime` in name-tbd"));
    }
}
