package com.skillpath.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
public class AnalyzeResponse {
    private String fieldName;
    private String demandLevel;
    private String trend;
    private int matchPercent;
    private List<String> skillsHave;
    private List<String> missingSkills;
    private List<String> recommendedCourses;
    private String aiAdvice;
}