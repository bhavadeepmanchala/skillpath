package com.skillpath.backend.service;

import com.skillpath.backend.domain.Skill;
import com.skillpath.backend.domain.SkillAlias;
import com.skillpath.backend.dto.SkillItem;
import com.skillpath.backend.repository.SkillAliasRepository;
import com.skillpath.backend.repository.SkillRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class SkillService {

    private final SkillRepository skillRepository;
    private final SkillAliasRepository skillAliasRepository;

    public SkillService(SkillRepository skillRepository, SkillAliasRepository skillAliasRepository) {
        this.skillRepository = skillRepository;
        this.skillAliasRepository = skillAliasRepository;
    }

    public List<SkillItem> getSkills() {
        List<Skill> skills = skillRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
        List<SkillAlias> allAliases = skillAliasRepository.findAll(Sort.by(Sort.Direction.ASC, "alias"));

        Map<Long, List<String>> aliasesBySkillId = new HashMap<>();
        for (SkillAlias sa : allAliases) {
            aliasesBySkillId.computeIfAbsent(sa.getSkillId(), k -> new ArrayList<>()).add(sa.getAlias());
        }

        return skills.stream()
            .map(s -> {
                List<String> aliases = aliasesBySkillId.getOrDefault(s.getId(), Collections.emptyList());
                return new SkillItem(s.getId(), s.getName(), s.getCategory(), aliases);
            })
            .toList();
    }
}
