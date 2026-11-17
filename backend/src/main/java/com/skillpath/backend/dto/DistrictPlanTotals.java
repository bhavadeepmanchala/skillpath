package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DistrictPlanTotals(
    @JsonProperty("totalSeats") int totalSeats,
    @JsonProperty("totalRecommendedSeats") int totalRecommendedSeats,
    @JsonProperty("totalTrainers") int totalTrainers,
    @JsonProperty("totalTrainersNeeded") int totalTrainersNeeded,
    @JsonProperty("trainerChange") int trainerChange
) {}
