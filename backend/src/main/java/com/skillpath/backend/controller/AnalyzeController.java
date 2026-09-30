package com.skillpath.backend.controller;

import com.skillpath.backend.dto.AnalyzeRequest;
import com.skillpath.backend.dto.AnalyzeResponse;
import com.skillpath.backend.model.Field;
import com.skillpath.backend.service.GeminiService;
import com.skillpath.backend.service.SkillMatchService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AnalyzeController {

    private final SkillMatchService skillMatchService;
    private final GeminiService geminiService;

    public AnalyzeController(SkillMatchService skillMatchService, GeminiService geminiService) {
        this.skillMatchService = skillMatchService;
        this.geminiService = geminiService;
    }

    @PostMapping("/analyze")
    public AnalyzeResponse analyze(@RequestBody AnalyzeRequest request) {
        Field bestField = skillMatchService.findBestMatch(request.getSkills());

        List<String> have = skillMatchService.findMatchingSkills(bestField, request.getSkills());
        List<String> missing = skillMatchService.findMissingSkills(bestField, request.getSkills());
        int matchPercent = skillMatchService.calculateMatchPercent(bestField, request.getSkills());

        String aiAdvice = geminiService.getAdvice(bestField.getName(), have, missing);

        return new AnalyzeResponse(
                bestField.getName(),
                bestField.getDemandLevel(),
                bestField.getTrend(),
                matchPercent,
                have,
                missing,
                bestField.getRecommendedCourses(),
                aiAdvice
        );
    }
    @GetMapping("/policymaker")
    public com.skillpath.backend.dto.PolicymakerResponse getPolicymakerSummary() {
        return skillMatchService.getPolicymakerSummary();
    }

    @GetMapping("/fields")
    public List<Field> getAllFields() {
        return skillMatchService.getAllFields();
    }
}