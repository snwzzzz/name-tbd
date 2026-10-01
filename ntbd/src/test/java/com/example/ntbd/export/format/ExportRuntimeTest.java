package com.example.ntbd.export.format;

import com.example.ntbd.Exception.ExportRuntimeUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExportRuntimeTest {

    private static ExportRuntime runtime(String... locations) {
        return new ExportRuntime(new DefaultResourceLoader(), List.of(locations));
    }

    @Test
    void usesTheFirstLocationThatHasTheRuntime() {
        String js = runtime("file:no/such/dir/", "classpath:export-runtime-test").file("main.js");

        assertTrue(js.contains("console.log"));
    }

    @Test
    void namesEveryPlaceItLookedWhenNoneHasIt() {
        ExportRuntimeUnavailableException e = assertThrows(ExportRuntimeUnavailableException.class,
                () -> runtime("file:no/such/dir/", "classpath:nothing-here/").file("main.js"));

        assertTrue(e.getMessage().contains("file:no/such/dir/") && e.getMessage().contains("classpath:nothing-here/"));
    }
}
