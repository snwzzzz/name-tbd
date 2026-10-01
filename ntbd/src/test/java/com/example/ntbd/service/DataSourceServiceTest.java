package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.datasource.TabularDataParserRegistry;
import com.example.ntbd.datasource.parsers.CsvParser;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.DataSourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataSourceServiceTest {

    @Mock
    private DataSourceRepository dataSourceRepository;

    @Mock
    private BranchRepository branchRepository;

    private DataSourceService dataSourceService;

    @BeforeEach
    void setUp() {
        var registry = new TabularDataParserRegistry(List.of(new CsvParser()));
        dataSourceService = new DataSourceService(dataSourceRepository, branchRepository, registry);
    }

    @Test
    void importDataSource() {
        Branch branch = new Branch();
        branch.setId(new Branch.BranchId(1L));
        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(dataSourceRepository.saveAndFlush(any(DataSource.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DataSourceDto result = dataSourceService.importDataSource(
                new NewDataSourceCommand(1L, " People ", "CSV", "name,age\nAlice,30\nBob"));

        assertEquals("People", result.name());
        assertEquals("csv", result.format());
        assertEquals(1L, result.branchId());
        assertEquals(List.of("name", "age"), result.columns());
        assertEquals(List.of(List.of("Alice", "30"), List.of("Bob", "")), result.rows());
    }

    @Test
    void importDataSource_BranchNotFound() {
        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.empty());

        assertThrows(BranchNotFoundException.class,
                () -> dataSourceService.importDataSource(new NewDataSourceCommand(1L, "People", "csv", "name")));
        verify(dataSourceRepository, never()).saveAndFlush(any());
    }

    @Test
    void importDataSource_BlankName() {
        assertThrows(IllegalArgumentException.class,
                () -> dataSourceService.importDataSource(new NewDataSourceCommand(1L, " ", "csv", "name")));
    }

    @Test
    void importDataSource_TooManyRows() {
        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(new Branch()));
        String csv = "n\n" + "1\n".repeat(DataSourceService.MAX_ROWS + 1);

        assertThrows(IllegalArgumentException.class,
                () -> dataSourceService.importDataSource(new NewDataSourceCommand(1L, "Big", "csv", csv)));
    }

    @Test
    void findById_NotFound() {
        when(dataSourceRepository.findById(new DataSource.DataSourceId(1L))).thenReturn(Optional.empty());

        assertThrows(DataSourceNotFoundException.class, () -> dataSourceService.findById(1L));
    }

    @Test
    void delete_NotFound() {
        when(dataSourceRepository.deleteInBulk(new DataSource.DataSourceId(1L))).thenReturn(0);

        assertThrows(DataSourceNotFoundException.class, () -> dataSourceService.delete(1L));
    }
}
