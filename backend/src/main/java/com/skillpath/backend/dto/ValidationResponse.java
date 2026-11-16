package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ValidationResponse(
    @JsonProperty("id") Long id,
    @JsonProperty("roleId") Long roleId,
    @JsonProperty("skillId") Long skillId,
    @JsonProperty("status") String status,
    @JsonProperty("note") String note,
    @JsonProperty("confidence") double confidence
) {}
