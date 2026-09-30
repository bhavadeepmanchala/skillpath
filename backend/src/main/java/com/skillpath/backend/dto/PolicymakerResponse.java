package com.skillpath.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class PolicymakerResponse {
    private List<FieldSummary> fields;
    private Map<String, Integer> demandDistribution; // e.g. {"High": 6, "Medium": 4, "Low": 4}
    private List<String> biggestSkillGaps; // top missing/high-demand skills across all fields

    @Data
    @AllArgsConstructor
    public static class FieldSummary {
        private String name;
        private String demandLevel;
        private String trend;
        private int avgOpenings;
    }
}