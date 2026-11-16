package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ValidationSummaryItem(
    @JsonProperty("roleId") Long roleId,
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("confirmedCount") long confirmedCount,
    @JsonProperty("disputedCount") long disputedCount,
    @JsonProperty("confidence") double confidence
) {}
