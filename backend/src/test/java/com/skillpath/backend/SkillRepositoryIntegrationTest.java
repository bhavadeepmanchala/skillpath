package com.skillpath.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.skillpath.backend.domain.Skill;
import com.skillpath.backend.repository.SkillRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class SkillRepositoryIntegrationTest {

    @Autowired
    private SkillRepository skillRepository;

    @Test
    void testFlywayMigrationAndSaveAndReadSkill() {
        Skill skill = new Skill(null, "Java", "Backend Development", true);
        Skill saved = skillRepository.save(skill);

        assertThat(saved.getId()).isNotNull();

        Optional<Skill> found = skillRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Java");
        assertThat(found.get().getCategory()).isEqualTo("Backend Development");
        assertThat(found.get().getActive()).isTrue();
    }
}
