package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class CourseControllerTest {

    private static final double TOLERANCE = 1e-6;

    @Autowired
    private CourseController courseController;

    @Autowired
    private RoleController roleController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(courseController, roleController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    /**
     * Hand-built test dataset:
     * Districts:
     *   1: District North
     *   2: District South
     * Roles:
     *   1: Cloud Architect (Sector: IT)
     *   2: DevOps Engineer (Sector: IT)
     * Skills:
     *   1: Kubernetes
     *   2: Terraform
     *   3: AWS
     *   4: Python
     * Courses:
     *   1: Cloud Mastery (duration: 12 weeks, sector: IT)
     *      teaches Skill 1 (Kubernetes), Skill 3 (AWS)
     *      linked to Role 1 (Cloud Architect)
     *   2: Legacy Systems (duration: 8 weeks, sector: IT)
     *      teaches Skill 4 (Python)
     *      linked to Role 2 (DevOps Engineer)
     *
     * Window:
     *   Latest month: 2026-09
     *   3-month window: 2026-07, 2026-08, 2026-09
     *   Outside window: 2026-06
     *
     * District 1 (Role 1):
     *   2026-07: total=100; S1=40, S2=30, S3=20, S4=10
     *   2026-08: total=100; S1=40, S2=30, S3=20, S4=10
     *   2026-09: total=100; S1=40, S2=30, S3=20, S4=10
     *   Total in scope (window) = 100+100+100 = 300.
     *   Shares: S1=120/300=0.40, S2=90/300=0.30, S3=60/300=0.20, S4=30/300=0.10.
     *   Course 1 teaches S1 and S3.
     *   Covered: S1(0.40) + S3(0.20) = 0.60. Total top skills sum = 1.00.
     *   coverageScore = (0.60 / 1.00) * 100 = 60.0.
     *
     * District 2 (Role 1):
     *   2026-07: total=100; S1=10, S2=20, S3=30, S4=40
     *   2026-08: total=100; S1=10, S2=20, S3=30, S4=40
     *   2026-09: total=100; S1=10, S2=20, S3=30, S4=40
     *
     * National (D1 + D2, Role 1):
     *   Total in scope = 300 + 300 = 600.
     *   S1: (120+30)/600 = 0.25
     *   S2: (90+60)/600  = 0.25
     *   S3: (60+90)/600  = 0.25
     *   S4: (30+120)/600 = 0.25
     *   Covered: S1(0.25) + S3(0.25) = 0.50. Total top skills sum = 1.00.
     *   coverageScore = (0.50 / 1.00) * 100 = 50.0.
     *
     * Month 2026-06 (Outside window):
     *   D1, R1: total=1000; S1=1000, S2=1000, S3=0, S4=0.
     *   Must be ignored by 3-month window.
     */
    private void seedHandBuiltDataset() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District North', 'State A')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District South', 'State B')");

        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Cloud Architect', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'DevOps Engineer', 'IT')");

        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'Kubernetes', 'Cloud', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (2, 'Terraform', 'Cloud', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (3, 'AWS', 'Cloud', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (4, 'Python', 'Programming', true)");

        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Cloud Mastery', 12, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (2, 'Legacy Systems', 8, 'IT')");

        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 1, 'Intermediate')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 3, 'Advanced')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (2, 4, 'Basic')");

        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (1, 1)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (2, 2)");

        // District 1, Role 1 across 3 window months (2026-07, 2026-08, 2026-09)
        String[] windowMonths = new String[]{"2026-07", "2026-08", "2026-09"};
        for (String m : windowMonths) {
            insertDemand(1, 1, 1, m, 40, 100);
            insertDemand(1, 1, 2, m, 30, 100);
            insertDemand(1, 1, 3, m, 20, 100);
            insertDemand(1, 1, 4, m, 10, 100);
        }

        // District 2, Role 1 across 3 window months
        for (String m : windowMonths) {
            insertDemand(2, 1, 1, m, 10, 100);
            insertDemand(2, 1, 2, m, 20, 100);
            insertDemand(2, 1, 3, m, 30, 100);
            insertDemand(2, 1, 4, m, 40, 100);
        }

        // Month outside window: 2026-06
        insertDemand(1, 1, 1, "2026-06", 1000, 1000);
        insertDemand(1, 1, 2, "2026-06", 1000, 1000);
        insertDemand(1, 1, 3, "2026-06", 0, 1000);
        insertDemand(1, 1, 4, "2026-06", 0, 1000);
    }

    private void insertDemand(long districtId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            districtId, roleId, skillId, month, withSkill, total
        );
    }

    @Test
    void testHandBuiltDatasetExactCoverageScoreDistrictFilter() throws Exception {
        // District 1: 300 postings. Shares: S1=0.40, S2=0.30, S3=0.20, S4=0.10.
        // Course 1 teaches S1 and S3.
        // Covered = 0.40 + 0.20 = 0.60. Total top skills sum = 1.00.
        // Expected coverageScore = 60.0 exactly.
        mockMvc.perform(get("/api/courses/1/alignment?role=1&district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.courseId", is(1)))
            .andExpect(jsonPath("$.courseName", is("Cloud Mastery")))
            .andExpect(jsonPath("$.roleId", is(1)))
            .andExpect(jsonPath("$.roleName", is("Cloud Architect")))
            .andExpect(jsonPath("$.districtId", is(1)))
            .andExpect(jsonPath("$.postingsInScope", is(300)))
            .andExpect(jsonPath("$.roleLinkedToCourse", is(true)))
            .andExpect(jsonPath("$.coverageScore", closeTo(60.0, TOLERANCE)))
            .andExpect(jsonPath("$.coveredSkills", hasSize(2)))
            .andExpect(jsonPath("$.coveredSkills[0].name", is("Kubernetes")))
            .andExpect(jsonPath("$.coveredSkills[0].demandShare", closeTo(0.40, TOLERANCE)))
            .andExpect(jsonPath("$.coveredSkills[1].name", is("AWS")))
            .andExpect(jsonPath("$.coveredSkills[1].demandShare", closeTo(0.20, TOLERANCE)))
            .andExpect(jsonPath("$.missingSkills", hasSize(2)))
            .andExpect(jsonPath("$.missingSkills[0].name", is("Terraform")))
            .andExpect(jsonPath("$.missingSkills[0].demandShare", closeTo(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.missingSkills[1].name", is("Python")))
            .andExpect(jsonPath("$.missingSkills[1].demandShare", closeTo(0.10, TOLERANCE)));
    }

    @Test
    void testDistrictFilterVsNationalGivesDifferentHandCheckedResults() throws Exception {
        // National (no district): 600 postings. Shares: S1=0.25, S2=0.25, S3=0.25, S4=0.25.
        // Course 1 teaches S1 and S3.
        // Covered = 0.25 + 0.25 = 0.50. Total sum = 1.00.
        // Expected coverageScore = 50.0 (versus 60.0 in District 1).
        mockMvc.perform(get("/api/courses/1/alignment?role=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId").doesNotExist())
            .andExpect(jsonPath("$.postingsInScope", is(600)))
            .andExpect(jsonPath("$.coverageScore", closeTo(50.0, TOLERANCE)))
            .andExpect(jsonPath("$.coveredSkills", hasSize(2)))
            .andExpect(jsonPath("$.missingSkills", hasSize(2)));
    }

    @Test
    void testTopNCapRespectedChangesScore() throws Exception {
        // In District 1, topN=2:
        // Top 2 skills are S1 (0.40) and S2 (0.30). Sum = 0.70.
        // Course 1 teaches S1 and S3. S3 is not in top 2.
        // Covered top skills: S1 (0.40).
        // coverageScore = (0.40 / 0.70) * 100 = 57.142857...
        double expectedScore = (0.40 / 0.70) * 100.0;
        mockMvc.perform(get("/api/courses/1/alignment?role=1&district=1&topN=2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.topN", is(2)))
            .andExpect(jsonPath("$.coverageScore", closeTo(expectedScore, TOLERANCE)))
            .andExpect(jsonPath("$.coveredSkills", hasSize(1)))
            .andExpect(jsonPath("$.coveredSkills[0].name", is("Kubernetes")))
            .andExpect(jsonPath("$.missingSkills", hasSize(1)))
            .andExpect(jsonPath("$.missingSkills[0].name", is("Terraform")));
    }

    @Test
    void testWindowBoundaryIgnoresOlderMonths() throws Exception {
        // 2026-06 has 1000 postings. If it were included, postingsInScope would be 1300.
        // Since default window is 3 months ending at 2026-09, postingsInScope must be exactly 300.
        mockMvc.perform(get("/api/courses/1/alignment?role=1&district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.postingsInScope", is(300)));
    }

    @Test
    void testPostingsInScopeNotInflatedBySkillRows() throws Exception {
        // In District 1 for Role 1, there are 4 skill rows each month with postings_total=100.
        // Across 3 months, summing postings_total across rows would wrongly give 4 * 100 * 3 = 1200.
        // Correct Rule 5 calculation yields 300.
        mockMvc.perform(get("/api/courses/1/alignment?role=1&district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.postingsInScope", is(300)));
    }

    @Test
    void testZeroPostingsInScopeReturnsZeroCoverageAndEmptyLists() throws Exception {
        // Role 2 has no demand in District 1.
        mockMvc.perform(get("/api/courses/1/alignment?role=2&district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.postingsInScope", is(0)))
            .andExpect(jsonPath("$.coverageScore", closeTo(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.coveredSkills", hasSize(0)))
            .andExpect(jsonPath("$.missingSkills", hasSize(0)))
            .andExpect(jsonPath("$.roleLinkedToCourse", is(false)));
    }

    @Test
    void testErrorCasesMissingRoleUnknownIds() throws Exception {
        // Missing role -> 400
        mockMvc.perform(get("/api/courses/1/alignment"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", is("role parameter is required")));

        // Unknown course -> 404
        mockMvc.perform(get("/api/courses/999/alignment?role=1"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message", is("Course not found: 999")));

        // Unknown role -> 404
        mockMvc.perform(get("/api/courses/1/alignment?role=999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message", is("Role not found: 999")));

        // Unknown district -> 404
        mockMvc.perform(get("/api/courses/1/alignment?role=1&district=999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message", is("District not found: 999")));
    }

    @Test
    void testGetRolesSortedByName() throws Exception {
        // Roles: "Cloud Architect", "DevOps Engineer"
        mockMvc.perform(get("/api/roles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].name", is("Cloud Architect")))
            .andExpect(jsonPath("$[0].sector", is("IT")))
            .andExpect(jsonPath("$[1].name", is("DevOps Engineer")))
            .andExpect(jsonPath("$[1].sector", is("IT")));
    }

    @Test
    void testGetCoursesShapeAndCount() throws Exception {
        // Course 1 has 2 skills, 1 linked role
        // Course 2 has 1 skill, 1 linked role
        // Alphabetical sort: "Cloud Mastery" before "Legacy Systems"
        mockMvc.perform(get("/api/courses"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id", is(1)))
            .andExpect(jsonPath("$[0].name", is("Cloud Mastery")))
            .andExpect(jsonPath("$[0].sector", is("IT")))
            .andExpect(jsonPath("$[0].durationWeeks", is(12)))
            .andExpect(jsonPath("$[0].skillCount", is(2)))
            .andExpect(jsonPath("$[0].linkedRoleCount", is(1)))
            .andExpect(jsonPath("$[1].id", is(2)))
            .andExpect(jsonPath("$[1].name", is("Legacy Systems")))
            .andExpect(jsonPath("$[1].durationWeeks", is(8)))
            .andExpect(jsonPath("$[1].skillCount", is(1)))
            .andExpect(jsonPath("$[1].linkedRoleCount", is(1)));
    }
}

