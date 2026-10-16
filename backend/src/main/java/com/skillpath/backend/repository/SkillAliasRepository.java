package com.skillpath.backend.repository;

import com.skillpath.backend.domain.SkillAlias;
import com.skillpath.backend.domain.SkillAliasId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillAliasRepository extends JpaRepository<SkillAlias, SkillAliasId> {
    List<SkillAlias> findBySkillId(Long skillId);
}
