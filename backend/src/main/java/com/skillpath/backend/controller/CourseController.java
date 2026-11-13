package com.skillpath.backend.controller;

import com.skillpath.backend.dto.CourseAlignmentResponse;
import com.skillpath.backend.dto.CourseItem;
import com.skillpath.backend.dto.CourseRecommendationsResponse;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.service.CourseService;
import com.skillpath.backend.service.RecommendationService;
import java.util.List;
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
@RequestMapping("/api/courses")
@CrossOrigin(origins = "*")
public class CourseController {

    private final CourseService courseService;
    private final RecommendationService recommendationService;

    public CourseController(CourseService courseService, RecommendationService recommendationService) {
        this.courseService = courseService;
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public List<CourseItem> getCourses() {
        return courseService.getCourses();
    }

    @GetMapping("/{id}/alignment")
    public CourseAlignmentResponse getCourseAlignment(
        @PathVariable("id") Long id,
        @RequestParam(name = "role", required = false) Long role,
        @RequestParam(name = "roleId", required = false) Long roleId,
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId,
        @RequestParam(name = "topN", required = false) Integer topN,
        @RequestParam(name = "windowMonths", required = false) Integer windowMonths
    ) {
        Long effectiveRoleId = role != null ? role : roleId;
        Long effectiveDistrictId = district != null ? district : districtId;
        return courseService.getCourseAlignment(id, effectiveRoleId, effectiveDistrictId, topN, windowMonths);
    }

    @GetMapping("/{id}/recommendations")
    public CourseRecommendationsResponse getRecommendations(
        @PathVariable("id") Long id,
        @RequestParam(name = "district", required = false) Long district,
        @RequestParam(name = "districtId", required = false) Long districtId
    ) {
        Long effectiveDistrictId = district != null ? district : districtId;
        return recommendationService.getRecommendations(id, effectiveDistrictId);
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

