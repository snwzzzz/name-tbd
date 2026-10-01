package com.example.ntbd.export.format;

import com.example.ntbd.Exception.ExportRuntimeUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * The exported app's runtime: the frontend's "runtime" build (index.html, main.js, styles.css),
 * which runs any app definition. Built into the classpath by {@code npm run build:runtime}.
 */
@Component
public class ExportRuntime {

    private final ResourceLoader resourceLoader;
    private final String location;

    public ExportRuntime(ResourceLoader resourceLoader,
                         @Value("${ntbd.export.runtime-location:classpath:export-runtime/}") String location) {
        this.resourceLoader = resourceLoader;
        this.location = location.endsWith("/") ? location : location + "/";
    }

    /** One of the runtime's files, as text. */
    public String file(String name) {
        Resource resource = resourceLoader.getResource(location + name);
        if (!resource.exists()) {
            throw new ExportRuntimeUnavailableException("The app runtime is missing " + name + " (at " + location
                    + "); build it with `npm run build:runtime` in name-tbd");
        }
        try {
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ExportRuntimeUnavailableException("The app runtime's " + name + " could not be read", e);
        }
    }
}
