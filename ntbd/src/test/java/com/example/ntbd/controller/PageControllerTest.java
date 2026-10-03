package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.service.PageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PageControllerTest {

    @Mock
    private PageService pageService;

    @Mock
    private WorkspaceAccess access;

    @InjectMocks
    private PageController pageController;

    @Test
    void createPage() {
        NewPageCommand command = new NewPageCommand("Home", "/home", 1L);
        PageDto dto = new PageDto(1L, "Home", "/home", 1L);
        
        when(pageService.createPage(command)).thenReturn(dto);

        ResponseEntity<PageDto> response = pageController.createPage(command);
        
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(dto, response.getBody());
    }
}
