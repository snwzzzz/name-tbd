package com.example.ntbd.controller;

import com.example.ntbd.Exception.DuplicateResourceException;
import com.example.ntbd.Exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND.value()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleConflict(DuplicateResourceException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.CONFLICT.value()));
    }

    @ExceptionHandler(com.example.ntbd.Exception.ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(com.example.ntbd.Exception.ForbiddenException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN.value()));
    }

    @ExceptionHandler(com.example.ntbd.auth.NotSignedInException.class)
    public ResponseEntity<ErrorResponse> handleNotSignedIn(com.example.ntbd.auth.NotSignedInException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.UNAUTHORIZED.value()));
    }

    @ExceptionHandler(com.example.ntbd.auth.SignInRejectedException.class)
    public ResponseEntity<ErrorResponse> handleSignInRejected(com.example.ntbd.auth.SignInRejectedException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(com.example.ntbd.Exception.ExportRuntimeUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleExportRuntimeUnavailable(com.example.ntbd.Exception.ExportRuntimeUnavailableException ex) {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.SERVICE_UNAVAILABLE.value()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value()));
    }

    /** A batch of changes failed at change {@code index} (counting from 0); answered as that change's error would be. */
    @ExceptionHandler(com.example.ntbd.Exception.ChangeFailedException.class)
    public ResponseEntity<ChangeErrorResponse> handleChangeFailed(com.example.ntbd.Exception.ChangeFailedException ex) {
        HttpStatus status = switch (ex.getCause()) {
            case ResourceNotFoundException ignored -> HttpStatus.NOT_FOUND;
            case com.example.ntbd.Exception.ForbiddenException ignored -> HttpStatus.FORBIDDEN;
            case null, default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(new ChangeErrorResponse(ex.getMessage(), status.value(), ex.index()));
    }

    public record ErrorResponse(String message, int status) {}

    public record ChangeErrorResponse(String message, int status, int index) {}
}