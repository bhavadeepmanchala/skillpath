package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TrendWindowRange(
    @JsonProperty("from") String from,
    @JsonProperty("to") String to
) {}

