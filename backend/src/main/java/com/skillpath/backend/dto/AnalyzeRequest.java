package com.skillpath.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class AnalyzeRequest {
    private List<String> skills;
    private String careerInterest; // optional, can be null
}