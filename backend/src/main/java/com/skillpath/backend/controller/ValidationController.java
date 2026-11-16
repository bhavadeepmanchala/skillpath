package com.skillpath.backend.controller;

import com.skillpath.backend.dto.ValidationRequest;
import com.skillpath.backend.dto.ValidationResponse;
import com.skillpath.backend.dto.ValidationSummaryItem;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.exception.TooManyRequestsException;
import com.skillpath.backend.service.ValidationService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/validations")
@CrossOrigin(origins = "*")
public class ValidationController {

    private final ValidationService validationService;

    public ValidationController(ValidationService validationService) {
        this.validationService = validationService;
    }

    @PostMapping
    public ResponseEntity<ValidationResponse> createValidation(@RequestBody ValidationRequest request) {
        ValidationResponse response = validationService.createValidation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<ValidationSummaryItem> getValidations(
        @RequestParam(name = "role", required = false) Long role,
        @RequestParam(name = "roleId", required = false) Long roleId,
        @RequestParam(name = "skill", required = false) Long skill,
        @RequestParam(name = "skillId", required = false) Long skillId
    ) {
        Long effectiveRole = role != null ? role : roleId;
        Long effectiveSkill = skill != null ? skill : skillId;
        return validationService.getValidationsSummary(effectiveRole, effectiveSkill);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.badRequest().body(Map.of(
            "error", ex.getMessage(),
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
            "error", ex.getMessage(),
            "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyRequests(TooManyRequestsException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
            "error", ex.getMessage(),
            "message", ex.getMessage()
        ));
    }
}
