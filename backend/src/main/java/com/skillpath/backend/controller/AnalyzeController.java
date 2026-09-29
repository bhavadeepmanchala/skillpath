package com.skillpath.backend.controller;

import com.skillpath.backend.dto.AnalyzeRequest;
import com.skillpath.backend.dto.AnalyzeResponse;
import com.skillpath.backend.model.Field;
import com.skillpath.backend.service.SkillMatchService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // allows frontend to call this during development
public class AnalyzeController {

    private final SkillMatchService skillMatchService;

    public AnalyzeController(SkillMatchService skillMatchService) {
        this.skillMatchService = skillMatchService;
    }

    @PostMapping("/analyze")
    public AnalyzeResponse analyze(@RequestBody AnalyzeRequest request) {
        Field bestField = skillMatchService.findBestMatch(request.getSkills());

        List<String> have = skillMatchService.findMatchingSkills(bestField, request.getSkills());
        List<String> missing = skillMatchService.findMissingSkills(bestField, request.getSkills());
        int matchPercent = skillMatchService.calculateMatchPercent(bestField, request.getSkills());

        // AI advice will be added in the next step — placeholder for now
        String placeholderAdvice = "AI advice will appear here once connected.";

        return new AnalyzeResponse(
                bestField.getName(),
                bestField.getDemandLevel(),
                bestField.getTrend(),
                matchPercent,
                have,
                missing,
                bestField.getRecommendedCourses(),
                placeholderAdvice
        );
    }

    @GetMapping("/fields")
    public List<Field> getAllFields() {
        return skillMatchService.getAllFields();
    }
}