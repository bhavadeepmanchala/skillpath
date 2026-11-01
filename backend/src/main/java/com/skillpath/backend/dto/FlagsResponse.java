package com.skillpath.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;

public record FlagsResponse(
    int windowMonths,
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate windowStart,
    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate windowEnd,
    double scalingFactor,
    double oversupplyThreshold,
    List<CourseOversupplyItem> items
) {}

