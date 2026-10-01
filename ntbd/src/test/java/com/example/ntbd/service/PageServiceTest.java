package com.example.ntbd.service;

import com.example.ntbd.Exception.DuplicateResourceException;
import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.PageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PageServiceTest {

    @Mock
    private PageRepository pageRepository;

    @Mock
    private BranchRepository branchRepository;

    @InjectMocks
    private PageService pageService;

    @Test
    void createPage() {
        NewPageCommand command = new NewPageCommand("Home", "/home", 1L);
        Branch branch = new Branch();
        branch.setId(new Branch.BranchId(1L));

        Page page = Page.builder().name("Home").path("/home").branch(branch).id(new Page.PageId(1L)).build();

        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(pageRepository.saveAndFlush(any(Page.class))).thenReturn(page);

        PageDto result = pageService.createPage(command);

        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals("Home", result.name());
        verify(branchRepository, times(1)).findById(new Branch.BranchId(1L));
        verify(pageRepository, times(1)).saveAndFlush(any(Page.class));
    }

    @Test
    void findById_NotFound() {
        when(pageRepository.findById(new Page.PageId(1L))).thenReturn(Optional.empty());
        assertThrows(PageNotFoundException.class, () -> pageService.findById(1L));
    }

    @Test
    void createPage_Layout() {
        Branch branch = new Branch();
        branch.setId(new Branch.BranchId(1L));
        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(pageRepository.existsByBranch_IdAndLayoutTrue(branch.getId())).thenReturn(false);
        when(pageRepository.saveAndFlush(any(Page.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PageDto result = pageService.createPage(new NewPageCommand("Layout", "/layout", 1L, true));

        assertTrue(result.layout());
    }

    @Test
    void createPage_SecondLayoutRejected() {
        Branch branch = new Branch();
        branch.setId(new Branch.BranchId(1L));
        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(pageRepository.existsByBranch_IdAndLayoutTrue(branch.getId())).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> pageService.createPage(new NewPageCommand("Layout 2", "/layout-2", 1L, true)));
        verify(pageRepository, never()).saveAndFlush(any());
    }
}
