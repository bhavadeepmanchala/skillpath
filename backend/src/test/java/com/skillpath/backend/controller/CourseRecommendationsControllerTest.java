package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
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
class CourseRecommendationsControllerTest {

    private static final double TOLERANCE = 1e-6;

    private static Matcher<Object> closeToDouble(double expected, double tolerance) {
        return new TypeSafeMatcher<Object>() {
            @Override
            protected boolean matchesSafely(Object item) {
                if (item instanceof Number n) {
                    return Math.abs(n.doubleValue() - expected) <= tolerance;
                }
                return false;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("a numeric value within ").appendValue(tolerance).appendText(" of ").appendValue(expected);
            }
        };
    }

    @Autowired
    private CourseController courseController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(courseController).build();
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

    private void seedHandBuiltDataset() {
        // Districts
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District Alpha', 'State 1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District Beta', 'State 2')");

        // Role
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Software Engineer', 'IT')");

        // Skills:
        // 1: Skill Alpha (untaught, rising fast)
        // 2: Skill Beta (untaught, flat high demand)
        // 3: Skill Charlie (taught, low and rising)
        // 4: Skill Delta (taught, steep faller -0.50 relativeGrowth, below max share)
        // 5: Skill Echo (taught, steep faller -0.80 relativeGrowth, below max share)
        // 6: Skill Foxtrot (untaught, below minPostings)
        // 7: Skill Golf (untaught, District 2 only)
        // 8: Skill Hotel (taught, slow faller: -5% relative growth > -10%)
        // 9: Skill India (taught, steep faller: -25% relative growth, but latestShare 0.45 > 0.40 max share)
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'Skill Alpha', 'CatA', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (2, 'Skill Beta', 'CatB', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (3, 'Skill Charlie', 'CatC', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (4, 'Skill Delta', 'CatD', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (5, 'Skill Echo', 'CatE', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (6, 'Skill Foxtrot', 'CatF', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (7, 'Skill Golf', 'CatG', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (8, 'Skill Hotel', 'CatH', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (9, 'Skill India', 'CatI', true)");

        // Courses
        // Course 1: linked to Role 1, teaches skills 3, 4, 5, 8, 9
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Web Development', 12, 'IT')");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (1, 1)");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 3, 'Intermediate')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 4, 'Intermediate')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 5, 'Intermediate')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 8, 'Intermediate')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (1, 9, 'Intermediate')");

        // Course 2: unlinked course (no linked roles)
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (2, 'Unlinked Course', 10, 'IT')");

        // 6 months: 2026-04 to 2026-09
        String[] months = {"2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"};

        // In District 1:
        // postings_total = 1000 per month
        // prev window: 04..06 (total = 3000), latest window: 07..09 (total = 3000)
        // Skill 1: 100/mo prev (300, share 0.10), 200/mo latest (600, share 0.20) -> growth 1.0, score 0.40
        // Skill 2: 300/mo prev (900, share 0.30), 300/mo latest (900, share 0.30) -> growth 0.0, score 0.30
        // Skill 3: 10/mo prev (30, share 0.01), 30/mo latest (90, share 0.03) -> trend +0.02 (rising, NOT retired)
        // Skill 4: 40/mo prev (120, share 0.04), 20/mo latest (60, share 0.02) -> trend -0.02, relGrowth -0.50 (RETIRED #2)
        // Skill 5: 50/mo prev (150, share 0.05), 10/mo latest (30, share 0.01) -> trend -0.04, relGrowth -0.80 (RETIRED #1)
        // Skill 6: 2 in month 04, 2 in month 07 -> total = 4 < 20 (excluded by min-postings guard)
        // Skill 8: 100/mo prev (300, share 0.10), 95/mo latest (285, share 0.095) -> trend -0.005, relGrowth -0.05 (slow faller, NOT retired)
        // Skill 9: 600/mo prev (1800, share 0.60), 450/mo latest (1350, share 0.45) -> trend -0.15, relGrowth -0.25 (share > 0.40, NOT retired)
        int[] d1Skill1 = {100, 100, 100, 200, 200, 200};
        int[] d1Skill2 = {300, 300, 300, 300, 300, 300};
        int[] d1Skill3 = {10, 10, 10, 30, 30, 30};
        int[] d1Skill4 = {40, 40, 40, 20, 20, 20};
        int[] d1Skill5 = {50, 50, 50, 10, 10, 10};
        int[] d1Skill6 = {2, 0, 0, 2, 0, 0};
        int[] d1Skill8 = {100, 100, 100, 95, 95, 95};
        int[] d1Skill9 = {600, 600, 600, 450, 450, 450};

        for (int i = 0; i < 6; i++) {
            String m = months[i];
            insertDemand(1, 1, 1, m, d1Skill1[i], 1000);
            insertDemand(1, 1, 2, m, d1Skill2[i], 1000);
            insertDemand(1, 1, 3, m, d1Skill3[i], 1000);
            insertDemand(1, 1, 4, m, d1Skill4[i], 1000);
            insertDemand(1, 1, 5, m, d1Skill5[i], 1000);
            insertDemand(1, 1, 6, m, d1Skill6[i], 1000);
            insertDemand(1, 1, 7, m, 0, 1000); // 0 in D1
            insertDemand(1, 1, 8, m, d1Skill8[i], 1000);
            insertDemand(1, 1, 9, m, d1Skill9[i], 1000);
        }

        // In District 2:
        // postings_total = 1000 per month
        // Skill 7 has 200 postings per month in D2 (600 prev, 600 latest)
        for (int i = 0; i < 6; i++) {
            String m = months[i];
            insertDemand(2, 1, 1, m, 0, 1000);
            insertDemand(2, 1, 2, m, 0, 1000);
            insertDemand(2, 1, 3, m, 0, 1000);
            insertDemand(2, 1, 4, m, 0, 1000);
            insertDemand(2, 1, 5, m, 0, 1000);
            insertDemand(2, 1, 6, m, 0, 1000);
            insertDemand(2, 1, 7, m, 200, 1000);
            insertDemand(2, 1, 8, m, 0, 1000);
            insertDemand(2, 1, 9, m, 0, 1000);
        }
    }

    private void insertDemand(long districtId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            districtId, roleId, skillId, month, withSkill, total
        );
    }

    @Test
    void testDistrictScopeRecommendationsAddRankingAndScore() throws Exception {
        // District 1 scope:
        // Denominators: prev=3000, latest=3000
        // ADD candidates:
        // - Skill Alpha (id=1): latestShare=0.20, prevShare=0.10, trend=0.10, relGrowth=1.0, score=0.40, postings=600
        // - Skill Beta (id=2): latestShare=0.30, prevShare=0.30, trend=0.0, relGrowth=0.0, score=0.30, postings=900
        // Ranks: Skill Alpha (#1, score=0.40), then Skill Beta (#2, score=0.30)
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.courseId", is(1)))
            .andExpect(jsonPath("$.courseName", is("Web Development")))
            .andExpect(jsonPath("$.districtId", is(1)))
            .andExpect(jsonPath("$.retireMinDecline", is(0.10)))
            .andExpect(jsonPath("$.retireMaxShare", is(0.40)))
            .andExpect(jsonPath("$.minShareForAdd", is(0.05)))
            .andExpect(jsonPath("$.latestWindow.from", is("2026-07")))
            .andExpect(jsonPath("$.latestWindow.to", is("2026-09")))
            .andExpect(jsonPath("$.previousWindow.from", is("2026-04")))
            .andExpect(jsonPath("$.previousWindow.to", is("2026-06")))
            .andExpect(jsonPath("$.add", hasSize(2)))
            .andExpect(jsonPath("$.add[0].skillId", is(1)))
            .andExpect(jsonPath("$.add[0].skillName", is("Skill Alpha")))
            .andExpect(jsonPath("$.add[0].latestShare", closeToDouble(0.20, TOLERANCE)))
            .andExpect(jsonPath("$.add[0].previousShare", closeToDouble(0.10, TOLERANCE)))
            .andExpect(jsonPath("$.add[0].trend", closeToDouble(0.10, TOLERANCE)))
            .andExpect(jsonPath("$.add[0].relativeGrowth", closeToDouble(1.0, TOLERANCE)))
            .andExpect(jsonPath("$.add[0].score", closeToDouble(0.40, TOLERANCE)))
            .andExpect(jsonPath("$.add[0].postingsLatest", is(600)))
            .andExpect(jsonPath("$.add[1].skillId", is(2)))
            .andExpect(jsonPath("$.add[1].skillName", is("Skill Beta")))
            .andExpect(jsonPath("$.add[1].latestShare", closeToDouble(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.add[1].previousShare", closeToDouble(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.add[1].trend", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.add[1].relativeGrowth", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.add[1].score", closeToDouble(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.add[1].postingsLatest", is(900)));
    }

    @Test
    void testFlatHighDemandSkillIsStillRecommended() throws Exception {
        // Skill Beta has trend = 0.0 and relativeGrowth = 0.0, but latestShare = 0.30 >= 0.05
        // Score = 0.30 * (1 + 0) = 0.30. It is successfully included in the ADD list!
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.add[1].skillName", is("Skill Beta")))
            .andExpect(jsonPath("$.add[1].score", closeToDouble(0.30, TOLERANCE)));
    }

    @Test
    void testSteepFallerBelowRetireMaxShareIsRetiredAndOrderedByRelativeGrowth() throws Exception {
        // Skill Echo (id=5): taught, relGrowth = -0.80 <= -0.10, latestShare = 0.01 <= 0.40 -> RETIRED (#1)
        // Skill Delta (id=4): taught, relGrowth = -0.50 <= -0.10, latestShare = 0.02 <= 0.40 -> RETIRED (#2)
        // Ordering by relativeGrowth ascending puts Echo (-0.80) ahead of Delta (-0.50)
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retire", hasSize(2)))
            .andExpect(jsonPath("$.retire[0].skillId", is(5)))
            .andExpect(jsonPath("$.retire[0].skillName", is("Skill Echo")))
            .andExpect(jsonPath("$.retire[0].latestShare", closeToDouble(0.01, TOLERANCE)))
            .andExpect(jsonPath("$.retire[0].previousShare", closeToDouble(0.05, TOLERANCE)))
            .andExpect(jsonPath("$.retire[0].trend", closeToDouble(-0.04, TOLERANCE)))
            .andExpect(jsonPath("$.retire[0].relativeGrowth", closeToDouble(-0.80, TOLERANCE)))
            .andExpect(jsonPath("$.retire[0].postingsLatest", is(30)))
            .andExpect(jsonPath("$.retire[0].score").doesNotExist())
            .andExpect(jsonPath("$.retire[1].skillId", is(4)))
            .andExpect(jsonPath("$.retire[1].skillName", is("Skill Delta")))
            .andExpect(jsonPath("$.retire[1].latestShare", closeToDouble(0.02, TOLERANCE)))
            .andExpect(jsonPath("$.retire[1].previousShare", closeToDouble(0.04, TOLERANCE)))
            .andExpect(jsonPath("$.retire[1].trend", closeToDouble(-0.02, TOLERANCE)))
            .andExpect(jsonPath("$.retire[1].relativeGrowth", closeToDouble(-0.50, TOLERANCE)))
            .andExpect(jsonPath("$.retire[1].postingsLatest", is(60)))
            .andExpect(jsonPath("$.retire[1].score").doesNotExist());
    }

    @Test
    void testSteepFallerAboveRetireMaxShareIsNotRetired() throws Exception {
        // Skill India (id=9): taught, relGrowth = -0.25 <= -0.10, BUT latestShare = 0.45 > 0.40
        // Because latestShare > retireMaxShare, this core skill must NOT be retired!
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retire[?(@.skillId == 9)]").isEmpty());
    }

    @Test
    void testSlowFallerSmallerThanRetireMinDeclineIsNotRetired() throws Exception {
        // Skill Hotel (id=8): taught, relGrowth = -0.05 > -0.10 (only fell 5%, threshold is 10%)
        // Because decline is smaller than retireMinDecline, it must NOT be retired!
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retire[?(@.skillId == 8)]").isEmpty());
    }

    @Test
    void testRisingSkillIsNotRetired() throws Exception {
        // Skill Charlie (id=3): taught, share=0.03, trend=+0.02 > 0 -> NOT retired!
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.retire[?(@.skillId == 3)]").isEmpty());
    }

    @Test
    void testMinPostingsExclusion() throws Exception {
        // Skill Foxtrot (id=6) has 2 postings in prev and 2 postings in latest (total 4 < 20)
        // Excluded from both ADD and RETIRE
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.add[?(@.skillId == 6)]").isEmpty())
            .andExpect(jsonPath("$.retire[?(@.skillId == 6)]").isEmpty());
    }

    @Test
    void testDistrictVsNationalScope() throws Exception {
        // In District 1: Skill Golf (id=7) has 0 postings, not present
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId", is(1)))
            .andExpect(jsonPath("$.add[?(@.skillId == 7)]").isEmpty());

        // Nationally (district omitted): total postings = 6000
        // Skill Golf has 600 postings in latest window -> share = 600/6000 = 0.10 >= 0.05 -> appears in ADD!
        mockMvc.perform(get("/api/courses/1/recommendations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId", nullValue()))
            .andExpect(jsonPath("$.add[?(@.skillId == 7)]").isNotEmpty());
    }

    @Test
    void testTaughtSkillsNeverInAddAndUntaughtNeverInRetire() throws Exception {
        // Taught skills are 3, 4, 5, 8, 9. Untaught are 1, 2, 6, 7.
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            // ADD must not contain 3, 4, 5, 8, 9
            .andExpect(jsonPath("$.add[?(@.skillId == 3)]").isEmpty())
            .andExpect(jsonPath("$.add[?(@.skillId == 4)]").isEmpty())
            .andExpect(jsonPath("$.add[?(@.skillId == 5)]").isEmpty())
            .andExpect(jsonPath("$.add[?(@.skillId == 8)]").isEmpty())
            .andExpect(jsonPath("$.add[?(@.skillId == 9)]").isEmpty())
            // RETIRE must not contain 1, 2, 6, 7
            .andExpect(jsonPath("$.retire[?(@.skillId == 1)]").isEmpty())
            .andExpect(jsonPath("$.retire[?(@.skillId == 2)]").isEmpty())
            .andExpect(jsonPath("$.retire[?(@.skillId == 6)]").isEmpty())
            .andExpect(jsonPath("$.retire[?(@.skillId == 7)]").isEmpty());
    }

    @Test
    void testUnknownCourseReturns404() throws Exception {
        mockMvc.perform(get("/api/courses/9999/recommendations"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", is("Course not found: 9999")));
    }

    @Test
    void testCourseWithNoLinkedRolesReturnsEmptyLists() throws Exception {
        // Course 2 has no linked roles
        mockMvc.perform(get("/api/courses/2/recommendations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.courseId", is(2)))
            .andExpect(jsonPath("$.courseName", is("Unlinked Course")))
            .andExpect(jsonPath("$.add", hasSize(0)))
            .andExpect(jsonPath("$.retire", hasSize(0)));
    }

    @Test
    void testMaxItemsCap() throws Exception {
        // Add 15 untaught skills with latestShare >= 0.05
        for (int s = 10; s <= 25; s++) {
            jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (" + s + ", 'Extra Skill " + s + "', 'CatX', true)");
            insertDemand(1, 1, s, "2026-07", 100, 1000);
            insertDemand(1, 1, s, "2026-08", 100, 1000);
            insertDemand(1, 1, s, "2026-09", 100, 1000);
            insertDemand(1, 1, s, "2026-04", 50, 1000);
            insertDemand(1, 1, s, "2026-05", 50, 1000);
            insertDemand(1, 1, s, "2026-06", 50, 1000);
        }

        // Default max-items is 10
        mockMvc.perform(get("/api/courses/1/recommendations").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.add", hasSize(10)));
    }
}
