package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.DataMode;
import com.example.ntbd.export.definition.ExportScope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * For live exports, section "liveData": where the data API is, the app key to call it with, and whether to
 * keep data in the browser for offline use. Never a connection's credentials: those stay on the server.
 */
@Component
@Order(210)
public class LiveDataContributor implements AppDefinitionContributor {

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        if (!scope.options().dataMode().live()) return;
        definition.put("liveData", new LiveData(scope.options().apiUrl(), scope.options().appKey(),
                scope.options().dataMode() == DataMode.LIVE_CACHED));
    }

    /**
     * @param apiUrl       the server's address; the app calls {@code <apiUrl>/api/data/<sourceId>}
     * @param key          the app key (anyone who has the export has it: it opens this app's data only, and can be revoked)
     * @param offlineCache keep the last rows read in the browser, and queue changes made while offline
     */
    public record LiveData(String apiUrl, String key, boolean offlineCache) {
    }
}
