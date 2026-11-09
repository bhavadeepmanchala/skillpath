package com.skillpath.backend.generator;

import java.time.LocalDate;
import java.util.List;

public record PostingData(
    List<JobPostingRow> postings,
    List<PostingSkillRow> postingSkills
) {
    public record JobPostingRow(long id, long roleId, long districtId, LocalDate postedOn, String level) {}
    public record PostingSkillRow(long postingId, long skillId, String requiredLevel) {}
}
