package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
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
class DemandControllerTest {

    private static final double TOLERANCE = 1e-9;

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
    private DemandController demandController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(demandController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    private void seedHandBuiltDataset() {
        // 2 districts
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'D1', 'State1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'D2', 'State2')");

        // 2 roles
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'R1', 'Sector1')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'R2', 'Sector2')");

        // 3 skills
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'S1', 'Cat1', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (2, 'S2', 'Cat2', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (3, 'S3', 'Cat3', true)");

        // 1 course
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'C1', 10, 'Sector1')");

        // demand_monthly:
        // Months: 2026-07, 2026-08, 2026-09
        // postings_total per month: D1+R1 = 10, D1+R2 = 10, D2+R1 = 20
        // S1: D1+R1 = 2, 4, 6 | D1+R2 = 0, 0, 0 | D2+R1 = 4, 4, 4
        // S2: D1+R1 = 5, 5, 5 | D1+R2 = 10, 10, 10 | D2+R1 = 0, 0, 0
        // S3: D1+R2 = 1, 1, 1 only

        // Month 2026-07
        insertDemand(1, 1, 1, "2026-07", 2, 10);
        insertDemand(1, 1, 2, "2026-07", 5, 10);
        insertDemand(1, 2, 1, "2026-07", 0, 10);
        insertDemand(1, 2, 2, "2026-07", 10, 10);
        insertDemand(1, 2, 3, "2026-07", 1, 10);
        insertDemand(2, 1, 1, "2026-07", 4, 20);
        insertDemand(2, 1, 2, "2026-07", 0, 20);

        // Month 2026-08
        insertDemand(1, 1, 1, "2026-08", 4, 10);
        insertDemand(1, 1, 2, "2026-08", 5, 10);
        insertDemand(1, 2, 1, "2026-08", 0, 10);
        insertDemand(1, 2, 2, "2026-08", 10, 10);
        insertDemand(1, 2, 3, "2026-08", 1, 10);
        insertDemand(2, 1, 1, "2026-08", 4, 20);
        insertDemand(2, 1, 2, "2026-08", 0, 20);

        // Month 2026-09
        insertDemand(1, 1, 1, "2026-09", 6, 10);
        insertDemand(1, 1, 2, "2026-09", 5, 10);
        insertDemand(1, 2, 1, "2026-09", 0, 10);
        insertDemand(1, 2, 2, "2026-09", 10, 10);
        insertDemand(1, 2, 3, "2026-09", 1, 10);
        insertDemand(2, 1, 1, "2026-09", 4, 20);
        insertDemand(2, 1, 2, "2026-09", 0, 20);
    }

    private void insertDemand(long districtId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            districtId, roleId, skillId, month, withSkill, total
        );
    }

    @Test
    void testSummary() throws Exception {
        mockMvc.perform(get("/api/demand/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostings", is(120)))
            .andExpect(jsonPath("$.totalSkills", is(3)))
            .andExpect(jsonPath("$.totalRoles", is(2)))
            .andExpect(jsonPath("$.totalDistricts", is(2)))
            .andExpect(jsonPath("$.totalCourses", is(1)))
            .andExpect(jsonPath("$.latestMonth", is("2026-09")))
            .andExpect(jsonPath("$.latestMonthPostings", is(40)))
            .andExpect(jsonPath("$.synthetic", is(true)));
    }

    @Test
    void testSkillsNoFilters() throws Exception {
        // default window covers all 3 months: denominator 120. Order S2 (45, 0.375), S1 (24, 0.2), S3 (3, 0.025)
        mockMvc.perform(get("/api/demand/skills"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(120)))
            .andExpect(jsonPath("$.skills", hasSize(3)))
            .andExpect(jsonPath("$.skills[0].name", is("S2")))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(45)))
            .andExpect(jsonPath("$.skills[0].share", closeToDouble(0.375, TOLERANCE)))
            .andExpect(jsonPath("$.skills[1].name", is("S1")))
            .andExpect(jsonPath("$.skills[1].postingsWithSkill", is(24)))
            .andExpect(jsonPath("$.skills[1].share", closeToDouble(0.2, TOLERANCE)))
            .andExpect(jsonPath("$.skills[2].name", is("S3")))
            .andExpect(jsonPath("$.skills[2].postingsWithSkill", is(3)))
            .andExpect(jsonPath("$.skills[2].share", closeToDouble(0.025, TOLERANCE)));
    }

    @Test
    void testSkillsFilterRoleR1() throws Exception {
        // denominator 90. S1 = 24/90 (0.26667), S2 = 15/90 (0.16667). S3 is absent.
        mockMvc.perform(get("/api/demand/skills").param("role", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(90)))
            .andExpect(jsonPath("$.roleId", is(1)))
            .andExpect(jsonPath("$.skills", hasSize(2)))
            .andExpect(jsonPath("$.skills[0].name", is("S1")))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(24)))
            .andExpect(jsonPath("$.skills[0].share", closeToDouble(24.0 / 90.0, TOLERANCE)))
            .andExpect(jsonPath("$.skills[1].name", is("S2")))
            .andExpect(jsonPath("$.skills[1].postingsWithSkill", is(15)))
            .andExpect(jsonPath("$.skills[1].share", closeToDouble(15.0 / 90.0, TOLERANCE)));
    }

    @Test
    void testSkillsFilterDistrictD2() throws Exception {
        // denominator 60. Only S1 = 12/60 = 0.2. S2 has 0 postings and is omitted.
        mockMvc.perform(get("/api/demand/skills").param("district", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(60)))
            .andExpect(jsonPath("$.districtId", is(2)))
            .andExpect(jsonPath("$.skills", hasSize(1)))
            .andExpect(jsonPath("$.skills[0].name", is("S1")))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(12)))
            .andExpect(jsonPath("$.skills[0].share", closeToDouble(0.2, TOLERANCE)));
    }

    @Test
    void testSkillsMonthRange() throws Exception {
        // from = to = 2026-09, no filters: denominator 40. S2 = 15/40 = 0.375, S1 = 10/40 = 0.25, S3 = 1/40 = 0.025.
        mockMvc.perform(get("/api/demand/skills").param("from", "2026-09").param("to", "2026-09"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(40)))
            .andExpect(jsonPath("$.skills", hasSize(3)))
            .andExpect(jsonPath("$.skills[0].name", is("S2")))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(15)))
            .andExpect(jsonPath("$.skills[0].share", closeToDouble(0.375, TOLERANCE)))
            .andExpect(jsonPath("$.skills[1].name", is("S1")))
            .andExpect(jsonPath("$.skills[1].postingsWithSkill", is(10)))
            .andExpect(jsonPath("$.skills[1].share", closeToDouble(0.25, TOLERANCE)))
            .andExpect(jsonPath("$.skills[2].name", is("S3")))
            .andExpect(jsonPath("$.skills[2].postingsWithSkill", is(1)))
            .andExpect(jsonPath("$.skills[2].share", closeToDouble(0.025, TOLERANCE)));
    }

    @Test
    void testSkillsLimit2() throws Exception {
        // limit = 2: returns only S2 and S1.
        mockMvc.perform(get("/api/demand/skills").param("limit", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(2)))
            .andExpect(jsonPath("$.skills[0].name", is("S2")))
            .andExpect(jsonPath("$.skills[1].name", is("S1")));
    }

    @Test
    void testTrendS1NoFilters() throws Exception {
        // trend S1, no filters: 2026-07 = 6/40 = 0.15, 2026-08 = 8/40 = 0.2, 2026-09 = 10/40 = 0.25.
        mockMvc.perform(get("/api/demand/skills/1/trend"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skillId", is(1)))
            .andExpect(jsonPath("$.name", is("S1")))
            .andExpect(jsonPath("$.points", hasSize(3)))
            .andExpect(jsonPath("$.points[0].month", is("2026-07")))
            .andExpect(jsonPath("$.points[0].postingsWithSkill", is(6)))
            .andExpect(jsonPath("$.points[0].postingsTotal", is(40)))
            .andExpect(jsonPath("$.points[0].share", closeToDouble(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.points[1].month", is("2026-08")))
            .andExpect(jsonPath("$.points[1].postingsWithSkill", is(8)))
            .andExpect(jsonPath("$.points[1].postingsTotal", is(40)))
            .andExpect(jsonPath("$.points[1].share", closeToDouble(0.20, TOLERANCE)))
            .andExpect(jsonPath("$.points[2].month", is("2026-09")))
            .andExpect(jsonPath("$.points[2].postingsWithSkill", is(10)))
            .andExpect(jsonPath("$.points[2].postingsTotal", is(40)))
            .andExpect(jsonPath("$.points[2].share", closeToDouble(0.25, TOLERANCE)));
    }

    @Test
    void testTrendS1RoleR1() throws Exception {
        // trend S1, role = R1: 0.2, 0.26667, 0.33333 (6/30, 8/30, 10/30).
        mockMvc.perform(get("/api/demand/skills/1/trend").param("role", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roleId", is(1)))
            .andExpect(jsonPath("$.points", hasSize(3)))
            .andExpect(jsonPath("$.points[0].share", closeToDouble(6.0 / 30.0, TOLERANCE)))
            .andExpect(jsonPath("$.points[1].share", closeToDouble(8.0 / 30.0, TOLERANCE)))
            .andExpect(jsonPath("$.points[2].share", closeToDouble(10.0 / 30.0, TOLERANCE)));
    }

    @Test
    void testTrendS1DistrictD1() throws Exception {
        // trend S1, district = D1: 0.1, 0.2, 0.3.
        mockMvc.perform(get("/api/demand/skills/1/trend").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId", is(1)))
            .andExpect(jsonPath("$.points", hasSize(3)))
            .andExpect(jsonPath("$.points[0].share", closeToDouble(0.1, TOLERANCE)))
            .andExpect(jsonPath("$.points[1].share", closeToDouble(0.2, TOLERANCE)))
            .andExpect(jsonPath("$.points[2].share", closeToDouble(0.3, TOLERANCE)));
    }

    @Test
    void testTrendS3DistrictD2() throws Exception {
        // trend S3, district = D2: three points, each with postingsTotal 20 and share 0.0.
        mockMvc.perform(get("/api/demand/skills/3/trend").param("district", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.points", hasSize(3)))
            .andExpect(jsonPath("$.points[0].postingsWithSkill", is(0)))
            .andExpect(jsonPath("$.points[0].postingsTotal", is(20)))
            .andExpect(jsonPath("$.points[0].share", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.points[1].postingsWithSkill", is(0)))
            .andExpect(jsonPath("$.points[1].postingsTotal", is(20)))
            .andExpect(jsonPath("$.points[1].share", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.points[2].postingsWithSkill", is(0)))
            .andExpect(jsonPath("$.points[2].postingsTotal", is(20)))
            .andExpect(jsonPath("$.points[2].share", closeToDouble(0.0, TOLERANCE)));
    }

    @Test
    void testDistrictsAllMonths() throws Exception {
        // districts, all months: D1 = 60, D2 = 60 (a tie, so D1 comes first by name ascending).
        mockMvc.perform(get("/api/demand/districts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.from", is("2026-07")))
            .andExpect(jsonPath("$.to", is("2026-09")))
            .andExpect(jsonPath("$.districts", hasSize(2)))
            .andExpect(jsonPath("$.districts[0].districtId", is(1)))
            .andExpect(jsonPath("$.districts[0].name", is("D1")))
            .andExpect(jsonPath("$.districts[0].postings", is(60)))
            .andExpect(jsonPath("$.districts[1].districtId", is(2)))
            .andExpect(jsonPath("$.districts[1].name", is("D2")))
            .andExpect(jsonPath("$.districts[1].postings", is(60)));
    }

    @Test
    void testDistrictsMonthRange() throws Exception {
        // districts, from = to = 2026-09: D1 = 20, D2 = 20.
        mockMvc.perform(get("/api/demand/districts").param("from", "2026-09").param("to", "2026-09"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.from", is("2026-09")))
            .andExpect(jsonPath("$.to", is("2026-09")))
            .andExpect(jsonPath("$.districts", hasSize(2)))
            .andExpect(jsonPath("$.districts[0].districtId", is(1)))
            .andExpect(jsonPath("$.districts[0].postings", is(20)))
            .andExpect(jsonPath("$.districts[1].districtId", is(2)))
            .andExpect(jsonPath("$.districts[1].postings", is(20)));
    }

    @Test
    void testControllerErrorsUnknownSkillId() throws Exception {
        // unknown skillId -> 404
        mockMvc.perform(get("/api/demand/skills/999/trend"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void testControllerErrorsMalformedMonth() throws Exception {
        // from = "2026-13" -> 400
        mockMvc.perform(get("/api/demand/skills").param("from", "2026-13"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        mockMvc.perform(get("/api/demand/districts").param("from", "2026-13"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        mockMvc.perform(get("/api/demand/skills/1/trend").param("to", "2026-13"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void testControllerErrorsLimitZero() throws Exception {
        // limit = 0 -> 400
        mockMvc.perform(get("/api/demand/skills").param("limit", "0"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void testControllerErrorsFromAfterTo() throws Exception {
        // from > to -> 400
        mockMvc.perform(get("/api/demand/skills").param("from", "2026-09").param("to", "2026-07"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void testControllerErrorsUnknownRoleOrDistrict() throws Exception {
        mockMvc.perform(get("/api/demand/skills").param("role", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()));

        mockMvc.perform(get("/api/demand/skills").param("district", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()));
    }
}
