package com.example.ntbd.export.format;

import com.example.ntbd.Exception.ExportRuntimeUnavailableException;
import com.example.ntbd.export.definition.AppDefinition;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SingleFileHtmlExportTest {

    private final ObjectMapper json = JsonMapper.builder().build();

    private SingleFileHtmlExport export(String runtimeLocation) {
        return new SingleFileHtmlExport(new ExportRuntime(new DefaultResourceLoader(), List.of(runtimeLocation)), json);
    }

    private AppDefinition definition(String appName) {
        AppDefinition definition = new AppDefinition(new AppDefinition.App(1L, appName));
        definition.put("pages", List.of(Map.of("name", "</script><script>alert(1)</script>")));
        return definition;
    }

    private static String between(String html, String start, String end) {
        Matcher m = Pattern.compile(Pattern.quote(start) + "(.*?)" + Pattern.quote(end), Pattern.DOTALL).matcher(html);
        assertTrue(m.find(), "no " + start + " in the page");
        return m.group(1);
    }

    @Test
    void inlinesTheRuntimeAndTheDefinitionIntoOneFile() {
        ExportedFile file = export("classpath:export-runtime-test/").export(definition("Käse <Shop>"));
        String html = new String(file.content(), StandardCharsets.UTF_8);

        assertEquals("kase-shop.html", file.fileName());
        assertEquals(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8), file.mediaType());
        assertTrue(html.contains("<title>Käse &lt;Shop&gt;</title>"));
        assertFalse(html.contains("src=\"main.js\"") || html.contains("href=\"styles.css\""), "nothing is loaded from other files");
        assertTrue(html.contains("<style>body{margin:0}"));
        assertTrue(html.contains("<script type=\"module\">const tag = "));
    }

    @Test
    void nothingInlinedCanEndItsElement() {
        String html = new String(export("classpath:export-runtime-test/").export(definition("Shop")).content(), StandardCharsets.UTF_8);

        String script = between(html, "<script type=\"module\">", "</script>");
        assertTrue(script.contains("\"<\\/script>\"") && script.contains("<\\!--"), script);
        assertTrue(script.contains("\"<title>App</title>\""), "the script's own text stays as it was");
        assertTrue(between(html, "<style>", "</style>").contains("\"<\\/style>\""));

        String embedded = between(html, "id=\"app-definition\">", "</script>");
        JsonNode definition = json.readTree(embedded);
        assertEquals(2, definition.get("version").asInt());
        assertEquals("Shop", definition.get("app").get("name").asString());
        assertEquals("</script><script>alert(1)</script>", definition.get("pages").get(0).get("name").asString());
    }

    @Test
    void saysHowToBuildTheRuntimeWhenItIsMissing() {
        ExportRuntimeUnavailableException e = assertThrows(ExportRuntimeUnavailableException.class,
                () -> export("classpath:no-such-runtime/").export(definition("Shop")));
        assertTrue(e.getMessage().contains("npm run build:runtime"));
    }

    @Test
    void makesFileNamesFromAppNames() {
        assertEquals("my-first-app.html", SingleFileHtmlExport.fileName("  My First App!! "));
        assertEquals("app.html", SingleFileHtmlExport.fileName("???"));
    }
}
