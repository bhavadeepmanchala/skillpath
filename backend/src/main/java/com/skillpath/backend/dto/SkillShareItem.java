package com.skillpath.backend.dto;

public record SkillShareItem(
    Long skillId,
    String name,
    Double demandShare
) {}

