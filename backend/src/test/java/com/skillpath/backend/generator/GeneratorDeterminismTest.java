package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class GeneratorDeterminismTest {

    private static final List<String> REFERENCE_TABLES = List.of(
        "skill",
        "skill_alias",
        "role",
        "district"
    );

    @Autowired
    private DataGenerator dataGenerator;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        cleanReferenceTables();
    }

    /**
     * Helper in test sources to clean reference tables in reverse FK order.
     */
    private void cleanReferenceTables() {
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    @Test
    void pureGenerateReferenceDataCalledTwiceGivesEqualResults() {
        ReferenceData refData1 = dataGenerator.generateReferenceData();
        ReferenceData refData2 = dataGenerator.generateReferenceData();

        assertThat(refData1).isEqualTo(refData2);
        assertThat(refData1.skills()).hasSameElementsAs(refData2.skills());
        assertThat(refData1.aliases()).hasSameElementsAs(refData2.aliases());
        assertThat(refData1.roles()).hasSameElementsAs(refData2.roles());
        assertThat(refData1.districts()).hasSameElementsAs(refData2.districts());

        // Validate explicit sequential IDs starting at 1
        assertThat(refData1.skills().get(0).id()).isEqualTo(1L);
        assertThat(refData1.skills().get(refData1.skills().size() - 1).id()).isEqualTo((long) refData1.skills().size());
        assertThat(refData1.roles().get(0).id()).isEqualTo(1L);
        assertThat(refData1.districts().get(0).id()).isEqualTo(1L);

        // All skills active=true
        for (ReferenceData.SkillRow skill : refData1.skills()) {
            assertThat(skill.active()).isTrue();
        }
    }

    @Test
    void runOnEmptyDatabaseGeneratesIdenticalChecksumsAcrossCleanAndReRun() {
        dataGenerator.run();
        String checksum1 = DatasetChecksum.calculate(jdbcTemplate, REFERENCE_TABLES);
        assertThat(checksum1).isNotBlank();

        cleanReferenceTables();

        dataGenerator.run();
        String checksum2 = DatasetChecksum.calculate(jdbcTemplate, REFERENCE_TABLES);

        assertThat(checksum2).isEqualTo(checksum1);
    }

    @Test
    void runOnNonEmptyDatabaseThrowsIllegalStateExceptionAndLeavesTablesUnchanged() {
        dataGenerator.run();
        String checksumBefore = DatasetChecksum.calculate(jdbcTemplate, REFERENCE_TABLES);

        assertThatThrownBy(() -> dataGenerator.run())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Database reference tables are not empty");

        String checksumAfter = DatasetChecksum.calculate(jdbcTemplate, REFERENCE_TABLES);
        assertThat(checksumAfter).isEqualTo(checksumBefore);
    }
}
