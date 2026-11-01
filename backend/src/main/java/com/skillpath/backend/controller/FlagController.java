package com.skillpath.backend.controller;

import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.service.OversupplyService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flags")
@CrossOrigin(origins = "*")
public class FlagController {

    private final OversupplyService oversupplyService;

    public FlagController(OversupplyService oversupplyService) {
        this.oversupplyService = oversupplyService;
    }

    @GetMapping
    public FlagsResponse getFlags(
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId
    ) {
        Long effectiveDistrictId = (district != null) ? district : districtId;
        return oversupplyService.getFlags(effectiveDistrictId);
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
}

