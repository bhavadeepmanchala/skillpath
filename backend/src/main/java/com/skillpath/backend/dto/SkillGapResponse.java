package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SkillGapResponse(
    @JsonProperty("name") String name,
    @JsonProperty("demand_share") double demandShare,
    @JsonProperty("course_coverage") double courseCoverage,
    @JsonProperty("growth_factor") double growthFactor,
    @JsonProperty("gap_score") double gapScore
) {}
