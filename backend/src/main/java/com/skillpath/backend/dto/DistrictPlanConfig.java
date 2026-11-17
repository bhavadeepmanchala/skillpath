package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DistrictPlanConfig(
    @JsonProperty("targetRatio") double targetRatio,
    @JsonProperty("expandBelowRatio") double expandBelowRatio,
    @JsonProperty("reviseCoverageThreshold") double reviseCoverageThreshold,
    @JsonProperty("reviseMaxSkills") int reviseMaxSkills,
    @JsonProperty("seatsPerTrainer") int seatsPerTrainer,
    @JsonProperty("minOpenings") int minOpenings
) {}
