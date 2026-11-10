package com.skillpath.backend.controller;

import com.skillpath.backend.dto.ReadinessResponse;
import com.skillpath.backend.service.ReadinessService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ready")
@CrossOrigin(origins = "*")
public class ReadinessController {

    private final ReadinessService readinessService;

    public ReadinessController(ReadinessService readinessService) {
        this.readinessService = readinessService;
    }

    @GetMapping
    public ReadinessResponse getReadiness() {
        return readinessService.getReadiness();
    }
}

