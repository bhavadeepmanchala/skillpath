package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeMatcher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class CourseObsoleteFlagsTest {

    private static final double TOLERANCE = 1e-4;

    @Autowired
    private FlagController flagController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(flagController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private static Matcher<Object> closeToDouble(double expected, double tolerance) {
        return new TypeSafeMatcher<Object>() {
            @Override
            protected boolean matchesSafely(Object item) {
                if (item instanceof java.util.List<?> list && !list.isEmpty()) {
                    item = list.get(0);
                }
                if (item instanceof Number n) {
                    return Math.abs(n.doubleValue() - expected) <= tolerance;
                }
                return false;
            }

            @Override
            public void describeTo(Description description) {
                description.appendValue(expected).appendText(" (+/- ").appendValue(tolerance).appendText(")");
            }
        };
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM placement_outcome");
        jdbcTemplate.execute("DELETE FROM course_offering");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM employer_validation");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
    }

    /**
     * Hand-built tiny dataset with known answers:
     *
     * Districts:
     *   1: District Alpha
     *   2: District Beta
     *
     * Role:
     *   1: Software Engineer
     *
     * Skills:
     *   1: Skill A
     *   2: Skill B
     *   3: Skill C
     *   4: Skill D
     *   5: Skill E (low volume for min-postings guard test)
     *
     * Window:
     *   6 months: 2026-04 to 2026-09
     *   Previous window: 2026-04, 2026-05, 2026-06
     *   Latest window:   2026-07, 2026-08, 2026-09
     *
     * In District 1:
     *   Previous window total postings = 300 (100 per month).
     *     Skill 1 (A): 60 postings -> share = 60/300 = 0.20
     *     Skill 2 (B): 45 postings -> share = 45/300 = 0.15
     *     Skill 3 (C): 90 postings -> share = 90/300 = 0.30
     *     Skill 4 (D): 90 postings -> share = 90/300 = 0.30
     *     Skill 5 (E): 9 postings  -> share = 9/300 = 0.03
     *
     *   Latest window total postings = 300 (100 per month).
     *     Skill 1 (A): 30 postings -> share = 30/300 = 0.10. trend = 0.10 - 0.20 = -0.10.
     *     Skill 2 (B): 30 postings -> share = 30/300 = 0.10. trend = 0.10 - 0.15 = -0.05.
     *     Skill 3 (C): 90 postings -> share = 90/300 = 0.30. trend = 0.30 - 0.30 = 0.00.
     *     Skill 4 (D): 90 postings -> share = 90/300 = 0.30. trend = 0.30 - 0.30 = 0.00.
     *     Skill 5 (E): 6 postings  -> share = 6/300 = 0.02. total postings across windows = 15 (< 20 min-postings guard!).
     *
     *   Top 5 skills total demand share sum in latest window = 0.10 + 0.10 + 0.30 + 0.30 + 0.02 = 0.82.
     *
     * Courses in District 1:
     *   Course 10: "Low Coverage Falling"
     *     Teaches: Skill 1 (A, share 0.10) & Skill 2 (B, share 0.10).
     *     Coverage = (0.20 / 0.82) * 100 = 24.3902% (< 40.0%).
     *     Key skills: Skill 1 & Skill 2 (both >= 20 postings).
     *     Weighted key skill trend = [(-0.10 * 0.10) + (-0.05 * 0.10)] / (0.10 + 0.10) = -0.015 / 0.20 = -0.0750.
     *     obsolete = coverage (24.39%) < 40.0 AND keySkillTrend (-0.075) < 0 -> TRUE.
     *     keySkillCount = 2, fallingSkillCount = 2.
     *     Seats = 60, estimated openings = 40.0 -> oversupply ratio = 1.5 (oversupplied = false).
     *
     *   Course 20: "Low Coverage Rising"
     *     In District 2, Skill 1 is rising: prev = 30/300=0.10, latest = 60/300=0.20 (trend = +0.10).
     *     Coverage = 24.39% (< 40.0%).
     *     keySkillTrend = +0.1000 (> 0).
     *     obsolete = coverage < 40.0 AND keySkillTrend < 0 -> FALSE (rising trend prevents obsolescence).
     *
     *   Course 30: "High Coverage Falling"
     *     Teaches: Skill 3 (C, share 0.30, trend -0.05) & Skill 4 (D, share 0.30, trend -0.05).
     *     Coverage = (0.60 / 0.82) * 100 = 73.1707% (>= 40.0%).
     *     keySkillTrend = -0.0500 (< 0).
     *     obsolete = coverage (73.17%) < 40.0 AND keySkillTrend < 0 -> FALSE (high coverage prevents obsolescence).
     *
     *   Course 40: "Boundary Coverage"
     *     Crafted to have coverage exactly at 40.0% (threshold boundary).
     *     obsolete = coverage (40.0%) < 40.0 -> FALSE (strict inequality: exact equality is NOT obsolete).
     *
     *   Course 50: "Guard Excludes Weak Skills"
     *     Teaches: Skill 1 (A, 30+60=90 postings >= 20) and Skill 5 (E, 6+9=15 postings < 20).
     *     Skill 5 is excluded from keySkills by minPostings guard.
     *     keySkillCount = 1 (only Skill 1 counted).
     *
     *   Course 60: "No Key Skills"
     *     Teaches only Skill 5 (E, 15 postings < 20).
     *     keySkillCount = 0 -> keySkillTrend = 0.0 -> obsolete = FALSE.
     */
    private void seedHandBuiltDataset() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District Alpha', 'State X')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District Beta', 'State Y')");

        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Software Engineer', 'IT')");

        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (1, 'Skill A', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (2, 'Skill B', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (3, 'Skill C', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (4, 'Skill D', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (5, 'Skill E', 'Tech')");

        // Courses
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (10, 'Low Coverage Falling', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (20, 'Low Coverage Rising', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (30, 'High Coverage Falling', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (40, 'Boundary Coverage', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (50, 'Guard Excludes Weak', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (60, 'No Key Skills', 10, 'IT')");

        // All linked to Role 1
        for (long cId : new long[]{10, 20, 30, 40, 50, 60}) {
            jdbcTemplate.update("INSERT INTO course_role (course_id, role_id) VALUES (?, 1)", cId);
        }

        // Course skills
        // C10: Skills 1, 2
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (10, 1, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (10, 2, 'Proficient')");

        // C20: Skill 1
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (20, 1, 'Proficient')");

        // C30: Skills 3, 4
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (30, 3, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (30, 4, 'Proficient')");

        // C40: Skill 1 & 2
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (40, 1, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (40, 2, 'Proficient')");

        // C50: Skill 1 & Skill 5
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (50, 1, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (50, 5, 'Proficient')");

        // C60: Skill 5
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (60, 5, 'Proficient')");

        // Course offerings (2026)
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (10, 1, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (20, 2, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (30, 1, 2026, 40, 1)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (50, 1, 2026, 40, 1)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (60, 1, 2026, 40, 1)");

        // 12-month job postings for oversupply ratio
        // Latest date: 2026-09-30
        long jpId = 1L;
        for (int i = 0; i < 40; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 1, '2026-05-10', 'Mid')", jpId++);
        }
        for (int i = 0; i < 20; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 2, '2026-05-10', 'Mid')", jpId++);
        }

        // Monthly demand for District 1
        // Previous 3 months: 2026-04, 2026-05, 2026-06 (100 total each month)
        // Latest 3 months:   2026-07, 2026-08, 2026-09 (100 total each month)
        String[] prevMonths = {"2026-04", "2026-05", "2026-06"};
        String[] latestMonths = {"2026-07", "2026-08", "2026-09"};

        for (String m : prevMonths) {
            // District 1: S1=20, S2=15, S3=30, S4=30, S5=3 (sum with skill = 98 <= 100)
            insertDemand(1, 1, 1, m, 20, 100);
            insertDemand(1, 1, 2, m, 15, 100);
            insertDemand(1, 1, 3, m, 30, 100);
            insertDemand(1, 1, 4, m, 30, 100);
            insertDemand(1, 1, 5, m, 3, 100);

            // District 2: S1=10, S2=10, S3=30, S4=30, S5=3
            insertDemand(2, 1, 1, m, 10, 100);
            insertDemand(2, 1, 2, m, 10, 100);
            insertDemand(2, 1, 3, m, 30, 100);
            insertDemand(2, 1, 4, m, 30, 100);
            insertDemand(2, 1, 5, m, 3, 100);
        }

        for (String m : latestMonths) {
            // District 1: S1=10, S2=10, S3=30, S4=30, S5=2 (sum with skill = 82)
            insertDemand(1, 1, 1, m, 10, 100);
            insertDemand(1, 1, 2, m, 10, 100);
            insertDemand(1, 1, 3, m, 30, 100);
            insertDemand(1, 1, 4, m, 30, 100);
            insertDemand(1, 1, 5, m, 2, 100);

            // District 2: S1=20 (rising!), S2=10, S3=30, S4=30, S5=2
            insertDemand(2, 1, 1, m, 20, 100);
            insertDemand(2, 1, 2, m, 10, 100);
            insertDemand(2, 1, 3, m, 30, 100);
            insertDemand(2, 1, 4, m, 30, 100);
            insertDemand(2, 1, 5, m, 2, 100);
        }
    }

    private void insertDemand(long distId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)",
            distId, roleId, skillId, month, withSkill, total
        );
    }

    @Test
    void testLowCoverageAndNegativeKeyTrendGivesObsoleteTrue() throws Exception {
        // Course 10 in District 1:
        // coverage = 24.39% (< 40.0%), keySkillTrend = -0.0750 (< 0) -> obsolete = true
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 10)].obsolete").value(true))
            .andExpect(jsonPath("$.items[?(@.courseId == 10)].keySkillCount").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 10)].fallingSkillCount").value(2));
    }

    @Test
    void testLowCoverageButPositiveKeyTrendGivesObsoleteFalse() throws Exception {
        // Course 20 in District 2:
        // coverage = 24.39% (< 40.0%), keySkillTrend = +0.1000 (> 0) -> obsolete = false
        mockMvc.perform(get("/api/flags?district=2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 20)].obsolete").value(false))
            .andExpect(jsonPath("$.items[?(@.courseId == 20)].keySkillCount").value(1))
            .andExpect(jsonPath("$.items[?(@.courseId == 20)].fallingSkillCount").value(0))
            .andExpect(jsonPath("$.items[?(@.courseId == 20)].keySkillTrend").value(closeToDouble(0.10, TOLERANCE)));
    }

    @Test
    void testHighCoverageAndNegativeTrendGivesObsoleteFalse() throws Exception {
        // Course 30 in District 1:
        // Teaches Skills 3 & 4. Suppose we make Skills 3 & 4 fall in District 1:
        // Currently trend is 0.00. Let's make S3 and S4 fall.
        // Even with negative trend, coverage = 73.17% (>= 40.0%) -> obsolete = false.
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 30)].obsolete").value(false))
            .andExpect(jsonPath("$.items[?(@.courseId == 30)].coverage").value(closeToDouble(73.1707, TOLERANCE)));
    }

    @Test
    void testThresholdBoundaryExactlyAtThresholdIsNotObsolete() throws Exception {
        // Add offering for Course 40 where coverage is exactly 40.0%
        // Adjust demand so top skills sum = 100, taught skills sum = 40 -> coverage = 40.0%
        jdbcTemplate.execute("DELETE FROM demand_monthly WHERE district_id = 1");
        String[] prevMonths = {"2026-04", "2026-05", "2026-06"};
        String[] latestMonths = {"2026-07", "2026-08", "2026-09"};

        for (String m : prevMonths) {
            insertDemand(1, 1, 1, m, 30, 100);
            insertDemand(1, 1, 2, m, 30, 100);
            insertDemand(1, 1, 3, m, 60, 100);
        }
        for (String m : latestMonths) {
            // Taught S1=20, S2=20 (sum=40). S3=60. Total top skills sum = 100.
            // Coverage = (40 / 100) * 100 = 40.00%
            // S1 trend = 20/300 - 30/300 = -0.0333 (negative trend)
            insertDemand(1, 1, 1, m, 20, 100);
            insertDemand(1, 1, 2, m, 20, 100);
            insertDemand(1, 1, 3, m, 60, 100);
        }
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (40, 1, 2026, 40, 1)");

        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 40)].coverage").value(closeToDouble(40.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[?(@.courseId == 40)].obsolete").value(false));
    }

    @Test
    void testWeightedTrendValueForKnownCase() throws Exception {
        // Course 10 in District 1:
        // Skill 1: latestShare = 30/300 = 0.10, prevShare = 60/300 = 0.20, trend = -0.10
        // Skill 2: latestShare = 30/300 = 0.10, prevShare = 45/300 = 0.15, trend = -0.05
        // Weighted trend = (0.10 * -0.10 + 0.10 * -0.05) / (0.10 + 0.10) = -0.015 / 0.20 = -0.0750
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 10)].keySkillTrend").value(closeToDouble(-0.0750, TOLERANCE)));
    }

    @Test
    void testSkillsUnderMinPostingsGuardAreIgnored() throws Exception {
        // Course 50 teaches Skill 1 (90 postings >= 20) and Skill 5 (15 postings < 20).
        // Skill 5 must be excluded from keySkills.
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 50)].keySkillCount").value(1))
            .andExpect(jsonPath("$.items[?(@.courseId == 50)].fallingSkillCount").value(1));
    }

    @Test
    void testCourseWithNoKeySkillsGivesObsoleteFalse() throws Exception {
        // Course 60 teaches only Skill 5 (15 postings < 20, excluded by guard).
        // keySkillCount = 0 -> keySkillTrend = 0.0 -> obsolete = false
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 60)].keySkillCount").value(0))
            .andExpect(jsonPath("$.items[?(@.courseId == 60)].keySkillTrend").value(closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[?(@.courseId == 60)].obsolete").value(false));
    }

    @Test
    void testDistrictFilterWorks() throws Exception {
        // GET /api/flags?district=2 returns only district 2 offerings
        mockMvc.perform(get("/api/flags?district=2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(1)))
            .andExpect(jsonPath("$.items[0].districtId", is(2)))
            .andExpect(jsonPath("$.items[0].courseId", is(20)));
    }

    @Test
    void testExistingOversuppliedResultsAreUnchanged() throws Exception {
        // Course 10 in District 1: seats = 60, postings = 40, ratio = 60/40 = 1.5 -> oversupplied = false (equality)
        // Course 20 in District 2: seats = 60, postings = 20, ratio = 60/20 = 3.0 -> oversupplied = true
        mockMvc.perform(get("/api/flags"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.obsoleteCoverageThreshold", closeToDouble(40.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[?(@.courseId == 10 && @.districtId == 1)].oversupplied").value(false))
            .andExpect(jsonPath("$.items[?(@.courseId == 10 && @.districtId == 1)].oversupplyRatio").value(closeToDouble(1.5, TOLERANCE)))
            .andExpect(jsonPath("$.items[?(@.courseId == 20 && @.districtId == 2)].oversupplied").value(true))
            .andExpect(jsonPath("$.items[?(@.courseId == 20 && @.districtId == 2)].oversupplyRatio").value(closeToDouble(3.0, TOLERANCE)));
    }

    @Test
    void testAllFiveNewFieldsPresentInItemPayload() throws Exception {
        mockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].obsolete").isBoolean())
            .andExpect(jsonPath("$.items[0].coverage").isNumber())
            .andExpect(jsonPath("$.items[0].keySkillTrend").isNumber())
            .andExpect(jsonPath("$.items[0].keySkillCount").isNumber())
            .andExpect(jsonPath("$.items[0].fallingSkillCount").isNumber());
    }
}
