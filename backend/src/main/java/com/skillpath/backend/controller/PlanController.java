package com.skillpath.backend.controller;

import com.skillpath.backend.dto.DistrictPlanResponse;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.service.PlanService;
import com.skillpath.backend.service.ReadinessService;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/districts")
@CrossOrigin(origins = "*")
public class PlanController {

    private final PlanService planService;
    private final ReadinessService readinessService;

    public PlanController(PlanService planService, ReadinessService readinessService) {
        this.planService = planService;
        this.readinessService = readinessService;
    }

    @GetMapping("/{id}/plan")
    public ResponseEntity<?> getPlan(
        @PathVariable("id") Long id,
        @RequestParam(name = "targetRatio", required = false) Double targetRatio,
        @RequestParam(name = "expandBelowRatio", required = false) Double expandBelowRatio,
        @RequestParam(name = "reviseCoverageThreshold", required = false) Double reviseCoverageThreshold,
        @RequestParam(name = "reviseMaxSkills", required = false) Integer reviseMaxSkills,
        @RequestParam(name = "seatsPerTrainer", required = false) Integer seatsPerTrainer,
        @RequestParam(name = "minOpenings", required = false) Integer minOpenings
    ) {
        if (!readinessService.getReadiness().ready()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "5")
                .body(Map.of(
                    "error", "Data is still loading, try again shortly",
                    "message", "Data is still loading, try again shortly"
                ));
        }

        DistrictPlanResponse response = planService.getDistrictPlan(
            id,
            targetRatio,
            expandBelowRatio,
            reviseCoverageThreshold,
            reviseMaxSkills,
            seatsPerTrainer,
            minOpenings
        );
        return ResponseEntity.ok(response);
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
