package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DemandSummaryResponse(
    @JsonProperty("totalPostings") long totalPostings,
    @JsonProperty("totalSkills") long totalSkills,
    @JsonProperty("totalRoles") long totalRoles,
    @JsonProperty("totalDistricts") long totalDistricts,
    @JsonProperty("totalCourses") long totalCourses,
    @JsonProperty("latestMonth") String latestMonth,
    @JsonProperty("latestMonthPostings") long latestMonthPostings,
    @JsonProperty("synthetic") boolean synthetic
) {}

