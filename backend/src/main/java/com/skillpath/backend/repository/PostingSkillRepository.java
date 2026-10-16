package com.skillpath.backend.repository;

import com.skillpath.backend.domain.PostingSkill;
import com.skillpath.backend.domain.PostingSkillId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostingSkillRepository extends JpaRepository<PostingSkill, PostingSkillId> {
    List<PostingSkill> findByPostingId(Long postingId);
}
