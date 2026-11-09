package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;

import com.skillpath.backend.dto.CourseAlignmentResponse;
import com.skillpath.backend.dto.CourseOversupplyItem;
import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.service.CourseService;
import com.skillpath.backend.service.OversupplyService;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class CoursePatternsIntegrationTest {

    private static final List<String> COURSE_TABLES = List.of(
        "course",
        "course_skill",
        "course_role",
        "course_offering",
        "placement_outcome"
    );

    @Autowired
    private DataGenerator dataGenerator;

    @Autowired
    private CourseGenerator courseGenerator;

    @Autowired
    private CourseService courseService;

    @Autowired
    private OversupplyService oversupplyService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        cleanCourseTables();
        cleanDemandTables();
        dataGenerator.run();
        courseGenerator.run();
    }

    @AfterEach
    void tearDown() {
        cleanCourseTables();
        cleanDemandTables();
    }

    private void cleanCourseTables() {
        jdbcTemplate.execute("DELETE FROM placement_outcome");
        jdbcTemplate.execute("DELETE FROM course_offering");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
    }

    private void cleanDemandTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    @Test
    void courseGeneratorDeterminismAcrossReRunsWithSameSeed() {
        String checksum1 = DatasetChecksum.calculate(jdbcTemplate, COURSE_TABLES);
        assertThat(checksum1).isNotBlank();

        cleanCourseTables();
        courseGenerator.run();
        String checksum2 = DatasetChecksum.calculate(jdbcTemplate, COURSE_TABLES);

        assertThat(checksum2).isEqualTo(checksum1);
    }

    @Test
    void plantedOversuppliedCourseHasHigherAverageRatioThanOthers() {
        FlagsResponse flags = oversupplyService.getFlags(null);
        assertThat(flags.items()).isNotEmpty();

        long plantedCourseId = 2L; // Course 2: Data Science & Machine Learning

        Map<Boolean, List<CourseOversupplyItem>> partitioned = flags.items().stream()
            .filter(item -> item.oversupplyRatio() != null)
            .collect(Collectors.partitioningBy(item -> item.courseId() == plantedCourseId));

        List<CourseOversupplyItem> plantedItems = partitioned.get(true);
        List<CourseOversupplyItem> otherItems = partitioned.get(false);

        assertThat(plantedItems).isNotEmpty();
        assertThat(otherItems).isNotEmpty();

        double avgPlantedRatio = plantedItems.stream()
            .mapToDouble(CourseOversupplyItem::oversupplyRatio)
            .average()
            .orElse(0.0);

        double avgOtherRatio = otherItems.stream()
            .mapToDouble(CourseOversupplyItem::oversupplyRatio)
            .average()
            .orElse(0.0);

        assertThat(avgPlantedRatio)
            .as("Planted oversupplied course 2 average ratio (%f) must be higher than other courses average ratio (%f)", avgPlantedRatio, avgOtherRatio)
            .isGreaterThan(avgOtherRatio);

        assertThat(avgPlantedRatio).isGreaterThan(flags.oversupplyThreshold());
    }

    @Test
    void plantedLowCoverageCourseHasLowerCoverageScoreThanPeersForSameRole() {
        long plantedCourseId = 4L; // Course 4: Modern Frontend Engineering
        long softwareEngineerRoleId = 1L; // Software Engineer

        CourseAlignmentResponse plantedAlignment = courseService.getCourseAlignment(
            plantedCourseId,
            softwareEngineerRoleId,
            null,
            null,
            null
        );

        List<Long> peerCourseIds = List.of(1L, 5L); // Full Stack Web Development, Backend Systems Architecture

        double sumPeerCoverage = 0.0;
        for (Long peerId : peerCourseIds) {
            CourseAlignmentResponse peerAlignment = courseService.getCourseAlignment(
                peerId,
                softwareEngineerRoleId,
                null,
                null,
                null
            );
            sumPeerCoverage += peerAlignment.coverageScore();
        }
        double avgPeerCoverage = sumPeerCoverage / peerCourseIds.size();

        assertThat(plantedAlignment.coverageScore())
            .as("Planted low-coverage course 4 coverage (%f) must be lower than peer courses average coverage (%f)",
                plantedAlignment.coverageScore(), avgPeerCoverage)
            .isLessThan(avgPeerCoverage);
    }

    @Test
    void plantedUntaughtSkillAppearsInNoCourseSkillRow() {
        String untaughtSkillName = "Critical Thinking & Problem Solving";

        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM course_skill cs JOIN skill s ON s.id = cs.skill_id WHERE s.name = ?",
            Integer.class,
            untaughtSkillName
        );

        assertThat(count)
            .as("Planted untaught skill '%s' must appear in 0 course_skill rows", untaughtSkillName)
            .isEqualTo(0);
    }
}

