package com.skillpath.backend.controller;

import com.skillpath.backend.dto.DemandSkillsResponse;
import com.skillpath.backend.dto.DemandSummaryResponse;
import com.skillpath.backend.dto.DemandTrendsResponse;
import com.skillpath.backend.dto.DistrictDemandResponse;
import com.skillpath.backend.dto.SkillTrendResponse;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.service.DemandService;
import com.skillpath.backend.service.TrendService;
import java.util.Map;
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
@RequestMapping("/api/demand")
@CrossOrigin(origins = "*")
public class DemandController {

    private final DemandService demandService;
    private final TrendService trendService;

    public DemandController(DemandService demandService, TrendService trendService) {
        this.demandService = demandService;
        this.trendService = trendService;
    }

    @GetMapping("/trends")
    public DemandTrendsResponse getTrends(
        @RequestParam(name = "role", required = false) Long role,
        @RequestParam(name = "roleId", required = false) Long roleId,
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId,
        @RequestParam(name = "window", required = false) Integer window,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        Long effectiveRole = role != null ? role : roleId;
        Long effectiveDistrict = district != null ? district : districtId;
        return trendService.getTrends(effectiveRole, effectiveDistrict, window, limit);
    }

    @GetMapping("/summary")
    public DemandSummaryResponse getSummary() {
        return demandService.getSummary();
    }

    @GetMapping("/skills")
    public DemandSkillsResponse getTopSkills(
        @RequestParam(name = "role", required = false) Long role,
        @RequestParam(name = "roleId", required = false) Long roleId,
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId,
        @RequestParam(name = "from", required = false) String from,
        @RequestParam(name = "to", required = false) String to,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        Long effectiveRole = role != null ? role : roleId;
        Long effectiveDistrict = district != null ? district : districtId;
        return demandService.getTopSkills(effectiveRole, effectiveDistrict, from, to, limit);
    }

    @GetMapping("/skills/{skillId}/trend")
    public SkillTrendResponse getSkillTrend(
        @PathVariable("skillId") Long skillId,
        @RequestParam(name = "role", required = false) Long role,
        @RequestParam(name = "roleId", required = false) Long roleId,
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId,
        @RequestParam(name = "from", required = false) String from,
        @RequestParam(name = "to", required = false) String to
    ) {
        Long effectiveRole = role != null ? role : roleId;
        Long effectiveDistrict = district != null ? district : districtId;
        return demandService.getSkillTrend(skillId, effectiveRole, effectiveDistrict, from, to);
    }

    @GetMapping("/districts")
    public DistrictDemandResponse getDistricts(
        @RequestParam(name = "from", required = false) String from,
        @RequestParam(name = "to", required = false) String to
    ) {
        return demandService.getDistricts(from, to);
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

