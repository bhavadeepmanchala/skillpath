package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.equalTo;
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
class DemandTrendsControllerTest {

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
        // Districts D1, D2
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'D1', 'State1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'D2', 'State2')");

        // Role R1
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'R1', 'Sector1')");

        // Skills: Alpha, Bravo, Charlie, Delta, Echo
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'Alpha Skill', 'CatA', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (2, 'Bravo Skill', 'CatB', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (3, 'Charlie Skill', 'CatC', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (4, 'Delta Skill', 'CatD', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (5, 'Echo Skill', 'CatE', true)");

        // Months: 2026-04, 05, 06, 07, 08, 09
        // postings_total = 100 for D1+R1 and for D2+R1 in every month
        // Alpha: D1 = 10,10,10,20,20,20 | D2 = 30,30,30,30,30,30
        // Bravo: D1 = 30,30,30,15,15,15 (no D2 rows)
        // Charlie: D1 = 20,20,20,20,20,20 (no D2 rows)
        // Delta: D1 = 0,0,0,2,2,2 (no D2 rows)
        // Echo: D1 = 0,0,0,8,8,8 (no D2 rows)

        String[] months = {"2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"};
        int[] alphaD1 = {10, 10, 10, 20, 20, 20};
        int[] bravoD1 = {30, 30, 30, 15, 15, 15};
        int[] charlieD1 = {20, 20, 20, 20, 20, 20};
        int[] deltaD1 = {0, 0, 0, 2, 2, 2};
        int[] echoD1 = {0, 0, 0, 8, 8, 8};

        for (int i = 0; i < 6; i++) {
            String m = months[i];
            // D1 + R1 rows
            insertDemand(1, 1, 1, m, alphaD1[i], 100);
            insertDemand(1, 1, 2, m, bravoD1[i], 100);
            insertDemand(1, 1, 3, m, charlieD1[i], 100);
            insertDemand(1, 1, 4, m, deltaD1[i], 100);
            insertDemand(1, 1, 5, m, echoD1[i], 100);

            // D2 + R1 row (Alpha only)
            insertDemand(2, 1, 1, m, 30, 100);
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
    void testDistrictD1Window3Default() throws Exception {
        // Expected A: district = D1, window 3 (default):
        // latestWindow 2026-07..2026-09, previousWindow 2026-04..2026-06.
        // rising = [Alpha (sharePrevious 0.1, shareLatest 0.2, change 0.1, relativeGrowth 1.0, postings 30 and 60),
        //           Echo (0.0, 0.08, change 0.08, relativeGrowth null, postings 0 and 24)].
        // declining = [Bravo (0.3, 0.15, change -0.15, relativeGrowth -0.5, postings 90 and 45)].
        // Charlie (change 0) and Delta (6 postings < 20) appear in neither list.
        mockMvc.perform(get("/api/demand/trends").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.window", is(3)))
            .andExpect(jsonPath("$.minPostings", is(20)))
            .andExpect(jsonPath("$.districtId", is(1)))
            .andExpect(jsonPath("$.roleId", nullValue()))
            .andExpect(jsonPath("$.latestWindow.from", is("2026-07")))
            .andExpect(jsonPath("$.latestWindow.to", is("2026-09")))
            .andExpect(jsonPath("$.previousWindow.from", is("2026-04")))
            .andExpect(jsonPath("$.previousWindow.to", is("2026-06")))
            .andExpect(jsonPath("$.rising", hasSize(2)))
            .andExpect(jsonPath("$.rising[0].skillId", is(1)))
            .andExpect(jsonPath("$.rising[0].name", is("Alpha Skill")))
            .andExpect(jsonPath("$.rising[0].category", is("CatA")))
            .andExpect(jsonPath("$.rising[0].shareLatest", closeToDouble(0.2, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].sharePrevious", closeToDouble(0.1, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].change", closeToDouble(0.1, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].relativeGrowth", closeToDouble(1.0, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].postingsLatest", is(60)))
            .andExpect(jsonPath("$.rising[0].postingsPrevious", is(30)))
            .andExpect(jsonPath("$.rising[1].skillId", is(5)))
            .andExpect(jsonPath("$.rising[1].name", is("Echo Skill")))
            .andExpect(jsonPath("$.rising[1].shareLatest", closeToDouble(0.08, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].sharePrevious", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].change", closeToDouble(0.08, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].relativeGrowth", nullValue()))
            .andExpect(jsonPath("$.rising[1].postingsLatest", is(24)))
            .andExpect(jsonPath("$.rising[1].postingsPrevious", is(0)))
            .andExpect(jsonPath("$.declining", hasSize(1)))
            .andExpect(jsonPath("$.declining[0].skillId", is(2)))
            .andExpect(jsonPath("$.declining[0].name", is("Bravo Skill")))
            .andExpect(jsonPath("$.declining[0].shareLatest", closeToDouble(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].sharePrevious", closeToDouble(0.3, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].change", closeToDouble(-0.15, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].relativeGrowth", closeToDouble(-0.5, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].postingsLatest", is(45)))
            .andExpect(jsonPath("$.declining[0].postingsPrevious", is(90)));
    }

    @Test
    void testNoFiltersWindow3() throws Exception {
        // Expected B: no filters, window 3: denominator 600 per window.
        // rising = [Alpha (0.2, 0.25, change 0.05, relativeGrowth 0.25), Echo (0.0, 0.04, change 0.04, relativeGrowth null)].
        // declining = [Bravo (0.15, 0.075, change -0.075, relativeGrowth -0.5)].
        mockMvc.perform(get("/api/demand/trends"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.window", is(3)))
            .andExpect(jsonPath("$.minPostings", is(20)))
            .andExpect(jsonPath("$.districtId", nullValue()))
            .andExpect(jsonPath("$.roleId", nullValue()))
            .andExpect(jsonPath("$.rising", hasSize(2)))
            .andExpect(jsonPath("$.rising[0].name", is("Alpha Skill")))
            .andExpect(jsonPath("$.rising[0].sharePrevious", closeToDouble(0.2, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].shareLatest", closeToDouble(0.25, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].change", closeToDouble(0.05, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].relativeGrowth", closeToDouble(0.25, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].name", is("Echo Skill")))
            .andExpect(jsonPath("$.rising[1].sharePrevious", closeToDouble(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].shareLatest", closeToDouble(0.04, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].change", closeToDouble(0.04, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].relativeGrowth", nullValue()))
            .andExpect(jsonPath("$.declining", hasSize(1)))
            .andExpect(jsonPath("$.declining[0].name", is("Bravo Skill")))
            .andExpect(jsonPath("$.declining[0].sharePrevious", closeToDouble(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].shareLatest", closeToDouble(0.075, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].change", closeToDouble(-0.075, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].relativeGrowth", closeToDouble(-0.5, TOLERANCE)));
    }

    @Test
    void testDistrictD1Window2() throws Exception {
        // Expected C: district = D1, window 2: latestWindow 2026-08..2026-09, previousWindow 2026-06..2026-07, denominator 200 per window.
        // rising = [Alpha (0.15, 0.2, change 0.05, relativeGrowth 0.33333), Echo (0.04, 0.08, change 0.04, relativeGrowth 1.0)].
        // declining = [Bravo (0.225, 0.15, change -0.075, relativeGrowth -0.33333)]. Delta is excluded (6 postings).
        mockMvc.perform(get("/api/demand/trends").param("district", "1").param("window", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.window", is(2)))
            .andExpect(jsonPath("$.latestWindow.from", is("2026-08")))
            .andExpect(jsonPath("$.latestWindow.to", is("2026-09")))
            .andExpect(jsonPath("$.previousWindow.from", is("2026-06")))
            .andExpect(jsonPath("$.previousWindow.to", is("2026-07")))
            .andExpect(jsonPath("$.rising", hasSize(2)))
            .andExpect(jsonPath("$.rising[0].name", is("Alpha Skill")))
            .andExpect(jsonPath("$.rising[0].sharePrevious", closeToDouble(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].shareLatest", closeToDouble(0.2, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].change", closeToDouble(0.05, TOLERANCE)))
            .andExpect(jsonPath("$.rising[0].relativeGrowth", closeToDouble(1.0 / 3.0, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].name", is("Echo Skill")))
            .andExpect(jsonPath("$.rising[1].sharePrevious", closeToDouble(0.04, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].shareLatest", closeToDouble(0.08, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].change", closeToDouble(0.04, TOLERANCE)))
            .andExpect(jsonPath("$.rising[1].relativeGrowth", closeToDouble(1.0, TOLERANCE)))
            .andExpect(jsonPath("$.declining", hasSize(1)))
            .andExpect(jsonPath("$.declining[0].name", is("Bravo Skill")))
            .andExpect(jsonPath("$.declining[0].sharePrevious", closeToDouble(0.225, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].shareLatest", closeToDouble(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].change", closeToDouble(-0.075, TOLERANCE)))
            .andExpect(jsonPath("$.declining[0].relativeGrowth", closeToDouble(-1.0 / 3.0, TOLERANCE)));
    }

    @Test
    void testDistrictD2Window3() throws Exception {
        // Expected D: district = D2, window 3: rising and declining are both empty lists.
        mockMvc.perform(get("/api/demand/trends").param("district", "2").param("window", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rising", hasSize(0)))
            .andExpect(jsonPath("$.declining", hasSize(0)));
    }

    @Test
    void testDistrictD1Limit1() throws Exception {
        // Expected E: district = D1, limit = 1: rising has only Alpha, declining has only Bravo.
        mockMvc.perform(get("/api/demand/trends").param("district", "1").param("limit", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rising", hasSize(1)))
            .andExpect(jsonPath("$.rising[0].name", is("Alpha Skill")))
            .andExpect(jsonPath("$.declining", hasSize(1)))
            .andExpect(jsonPath("$.declining[0].name", is("Bravo Skill")));
    }

    @Test
    void testControllerErrors() throws Exception {
        // Expected F: Errors:
        // window = 4 -> 400 (needs 8 months, only 6 exist)
        mockMvc.perform(get("/api/demand/trends").param("window", "4"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        // window = 0 -> 400
        mockMvc.perform(get("/api/demand/trends").param("window", "0"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        // window = 10 -> 400
        mockMvc.perform(get("/api/demand/trends").param("window", "10"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        // limit = 0 -> 400
        mockMvc.perform(get("/api/demand/trends").param("limit", "0"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error", notNullValue()));

        // district = 999 -> 404
        mockMvc.perform(get("/api/demand/trends").param("district", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()));

        // role = 999 -> 404
        mockMvc.perform(get("/api/demand/trends").param("role", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()));
    }
}

