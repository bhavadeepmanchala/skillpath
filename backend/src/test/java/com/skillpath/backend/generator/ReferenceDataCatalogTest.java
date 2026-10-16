package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

class ReferenceDataCatalogTest {

    @Test
    void skillCatalogSatisfiesAllStructuralAndDistributionRules() {
        List<SkillCatalog.SkillDef> skills = SkillCatalog.all();

        // 75-85 skills
        assertThat(skills.size()).isBetween(75, 85);

        // Names unique (case-insensitive)
        Set<String> uniqueSkillNames = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Map<String, Integer> categoryCounts = new LinkedHashMap<>();

        int skillsWithAliases = 0;
        Set<String> allAliases = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        for (SkillCatalog.SkillDef skill : skills) {
            assertThat(uniqueSkillNames.add(skill.name()))
                .as("Duplicate skill name: %s", skill.name())
                .isTrue();

            categoryCounts.merge(skill.category(), 1, Integer::sum);

            if (!skill.aliases().isEmpty()) {
                skillsWithAliases++;
                for (String alias : skill.aliases()) {
                    assertThat(allAliases.add(alias))
                        .as("Duplicate alias: %s", alias)
                        .isTrue();
                }
            }
        }

        // Expected 12 categories, every category non-empty
        List<String> expectedCategories = List.of(
            "Programming & Software",
            "Web & Mobile",
            "Data & AI",
            "Cloud & DevOps",
            "Electronics & Embedded",
            "Electrical & Mechanical",
            "Manufacturing & Quality",
            "Healthcare & Care",
            "Retail & Sales",
            "Finance & Accounting",
            "Logistics & Supply Chain",
            "Workplace & Soft Skills"
        );

        for (String expectedCategory : expectedCategories) {
            assertThat(categoryCounts.get(expectedCategory))
                .as("Category %s must be present and non-empty", expectedCategory)
                .isNotNull()
                .isGreaterThan(0);
        }

        // About 25 skills have at least one real-world alias
        assertThat(skillsWithAliases).isBetween(20, 30);

        // Every alias must differ from every skill name (case-insensitive)
        for (String alias : allAliases) {
            assertThat(uniqueSkillNames.contains(alias))
                .as("Alias '%s' conflicts with an existing skill name", alias)
                .isFalse();
        }
    }

    @Test
    void skillCatalogByNameReturnsMatchAndThrowsOnUnknown() {
        SkillCatalog.SkillDef java = SkillCatalog.byName("Java");
        assertThat(java).isNotNull();
        assertThat(java.name()).isEqualTo("Java");
        assertThat(java.category()).isEqualTo("Programming & Software");

        // Case-insensitive lookup
        SkillCatalog.SkillDef python = SkillCatalog.byName("python");
        assertThat(python).isNotNull();
        assertThat(python.name()).isEqualTo("Python");

        assertThatThrownBy(() -> SkillCatalog.byName("UnknownNonExistentSkillXYZ"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unknown skill name");

        assertThatThrownBy(() -> SkillCatalog.byName(null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void roleCatalogSatisfiesAllStructuralAndDistributionRules() {
        List<RoleCatalog.RoleDef> roles = RoleCatalog.all();

        // 15-20 roles
        assertThat(roles.size()).isBetween(15, 20);

        // 6-8 sectors
        List<String> sectors = Sectors.ALL;
        assertThat(sectors.size()).isBetween(6, 8);

        // Names unique (case-insensitive)
        Set<String> uniqueRoleNames = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Map<String, Integer> rolesPerSector = new LinkedHashMap<>();

        for (RoleCatalog.RoleDef role : roles) {
            assertThat(uniqueRoleNames.add(role.name()))
                .as("Duplicate role name: %s", role.name())
                .isTrue();
            rolesPerSector.merge(role.sector(), 1, Integer::sum);
        }

        // At least 2 roles per sector
        for (String sector : sectors) {
            assertThat(rolesPerSector.get(sector))
                .as("Sector %s must have at least 2 roles", sector)
                .isNotNull()
                .isGreaterThanOrEqualTo(2);
        }
    }

    @Test
    void districtCatalogSatisfiesAllDistributionRules() {
        List<DistrictCatalog.DistrictDef> districts = DistrictCatalog.all();

        // 30-40 real Indian districts
        assertThat(districts.size()).isBetween(30, 40);

        // (name, state) unique
        Set<String> uniquePairs = new HashSet<>();
        Map<String, Integer> stateCounts = new LinkedHashMap<>();

        for (DistrictCatalog.DistrictDef district : districts) {
            String key = district.name() + "#" + district.state();
            assertThat(uniquePairs.add(key))
                .as("Duplicate district in state: %s, %s", district.name(), district.state())
                .isTrue();

            stateCounts.merge(district.state(), 1, Integer::sum);
        }

        // At least 10 states
        assertThat(stateCounts.keySet().size()).isGreaterThanOrEqualTo(10);

        // At most 5 per state, and no state should dominate
        for (Map.Entry<String, Integer> entry : stateCounts.entrySet()) {
            assertThat(entry.getValue())
                .as("State %s has more than 5 districts", entry.getKey())
                .isLessThanOrEqualTo(5);
        }
    }
}
