package com.skillpath.backend.generator;

import java.util.List;

public record ReferenceData(
    List<SkillRow> skills,
    List<SkillAliasRow> aliases,
    List<RoleRow> roles,
    List<DistrictRow> districts
) {
    public record SkillRow(long id, String name, String category, boolean active) {}
    public record SkillAliasRow(long skillId, String alias) {}
    public record RoleRow(long id, String name, String sector) {}
    public record DistrictRow(long id, String name, String state) {}
}
