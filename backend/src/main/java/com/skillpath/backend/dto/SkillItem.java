package com.skillpath.backend.dto;

import java.util.List;

public record SkillItem(Long id, String name, String category, List<String> aliases) {}
