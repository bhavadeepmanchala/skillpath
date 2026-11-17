package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DistrictPlanCounts(
    @JsonProperty("reduce") int reduce,
    @JsonProperty("revise") int revise,
    @JsonProperty("expand") int expand,
    @JsonProperty("keep") int keep
) {}
