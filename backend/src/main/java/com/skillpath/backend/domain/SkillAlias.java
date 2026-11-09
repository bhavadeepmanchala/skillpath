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
@Table(name = "skill_alias")
@IdClass(SkillAliasId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillAlias {

    @Id
    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    @Id
    @Column(name = "alias", nullable = false)
    private String alias;
}
