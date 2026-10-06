package com.example.ntbd.livedata.connector;

import com.example.ntbd.livedata.oauth.AccessTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class MicrosoftGraphConnectorTest {

    private static final String GRAPH = "https://graph.microsoft.com/v1.0";
    private static final ConnectionRef CONNECTION = new ConnectionRef(1L, "msgraph", Settings.EMPTY, new Settings(Map.of("refreshToken", "r")));

    private MockRestServiceServer graph;
    private MicrosoftGraphConnector connector;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        graph = MockRestServiceServer.bindTo(builder).build();
        AccessTokens tokens = mock(AccessTokens.class);
        when(tokens.accessToken(any())).thenReturn("graph-token");
        connector = new MicrosoftGraphConnector(tokens, builder, GRAPH);
    }

    @Test
    void reads_a_sharepoint_list_page_by_page_with_item_ids_as_row_ids() {
        SourceRef list = new SourceRef(1L, CONNECTION, new Settings(Map.of("type", "list", "site", "contoso.sharepoint.com:/sites/sales", "list", "Orders")),
                null, List.of("Title", "Amount"), 100);
        String items = GRAPH + "/sites/contoso.sharepoint.com:/sites/sales/lists/Orders/items";
        graph.expect(requestTo(items + "?$expand=fields&$top=101")).andExpect(header("Authorization", "Bearer graph-token"))
                .andRespond(withSuccess("{\"value\":[{\"id\":\"1\",\"fields\":{\"Title\":\"Ada\",\"Amount\":750}}],"
                        + "\"@odata.nextLink\":\"" + items + "?$skiptoken=2\"}", MediaType.APPLICATION_JSON));
        graph.expect(requestTo(items + "?$skiptoken=2"))
                .andRespond(withSuccess("{\"value\":[{\"id\":\"2\",\"fields\":{\"Title\":\"Bob\"}}]}", MediaType.APPLICATION_JSON));

        assertThat(connector.read(list).rows()).containsExactly(
                new LiveRow("1", List.of("Ada", "750")), new LiveRow("2", List.of("Bob", "")));
        graph.verify();
    }

    @Test
    void writes_list_items_with_typed_fields() {
        SourceRef list = new SourceRef(1L, CONNECTION, new Settings(Map.of("type", "list", "site", "contoso.sharepoint.com:/sites/sales",
                "list", "Orders", "columnTypes", Map.of("Amount", "number"))), null, List.of("Title", "Amount"), 100);
        String items = GRAPH + "/sites/contoso.sharepoint.com:/sites/sales/lists/Orders/items";
        graph.expect(requestTo(items)).andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"fields\":{\"Title\":\"Cleo\",\"Amount\":12}}"))
                .andRespond(withSuccess("{\"id\":\"3\",\"fields\":{\"Title\":\"Cleo\",\"Amount\":12}}", MediaType.APPLICATION_JSON));
        graph.expect(requestTo(items + "/3")).andExpect(method(HttpMethod.DELETE)).andRespond(withNoContent());

        assertThat(connector.insert(list, Map.of("Title", "Cleo", "Amount", "12"))).isEqualTo(new LiveRow("3", List.of("Cleo", "12")));
        connector.delete(list, List.of("3"));
        graph.verify();
    }

    @Test
    void changes_an_excel_table_row_found_by_its_key() {
        SourceRef table = new SourceRef(1L, CONNECTION, new Settings(Map.of("type", "excel", "file", "/Documents/orders.xlsx", "table", "Orders")),
                "OrderNo", List.of("OrderNo", "Customer"), 100);
        String base = GRAPH + "/me/drive/root:/Documents/orders.xlsx:/workbook/tables/Orders";
        graph.expect(requestTo(base + "/range?$select=text"))
                .andRespond(withSuccess("{\"text\":[[\"OrderNo\",\"Customer\"],[\"A-1\",\"Ada\"],[\"A-2\",\"Bob\"]]}", MediaType.APPLICATION_JSON));
        graph.expect(requestTo(base + "/rows/itemAt(index=1)")).andExpect(method(HttpMethod.PATCH))
                .andExpect(content().json("{\"values\":[[\"A-2\",\"Bobby\"]]}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThat(connector.update(table, "A-2", Map.of("Customer", "Bobby"))).isEqualTo(new LiveRow("A-2", List.of("A-2", "Bobby")));
        graph.verify();
    }
}
