package com.example.ntbd.controller;

import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.service.DataSourceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSourceControllerTest {

    @Mock
    private DataSourceService dataSourceService;

    @InjectMocks
    private DataSourceController dataSourceController;

    @Test
    void importDataSource() {
        NewDataSourceCommand command = new NewDataSourceCommand(1L, "People", "csv", "name\nAlice");
        DataSourceDto dto = new DataSourceDto(1L, "People", "csv", 1L, List.of("name"), List.of(List.of("Alice")));

        when(dataSourceService.importDataSource(command)).thenReturn(dto);

        ResponseEntity<DataSourceDto> response = dataSourceController.importDataSource(command);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(dto, response.getBody());
    }

    @Test
    void deleteDataSource() {
        ResponseEntity<Void> response = dataSourceController.deleteDataSource(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(dataSourceService).delete(1L);
    }
}
