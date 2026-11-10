package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReadinessResponse(
    @JsonProperty("ready") boolean ready,
    @JsonProperty("phase") String phase,
    @JsonProperty("synthetic") boolean synthetic
) {}

