package com.skillpath.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "posting_skill")
@IdClass(PostingSkillId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostingSkill {

    @Id
    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Id
    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    @Column(name = "required_level")
    private String requiredLevel;
}
