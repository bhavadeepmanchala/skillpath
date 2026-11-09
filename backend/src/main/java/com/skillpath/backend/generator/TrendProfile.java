package com.skillpath.backend.generator;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Synthetic trend profiles defining illustrative growth and decline patterns for specific skills.
 * Trends are synthetic design choices used to exercise the alignment engine,
 * and do not represent claims about the real job market.
 */
public final class TrendProfile {

    public record Trend(String skillName, double startMultiplier, double endMultiplier) {}

    private static final List<String> RISING_SKILLS = List.of(
        "Kubernetes",
        "Machine Learning",
        "Internet of Things",
        "Cold Chain Logistics",
        "Digital Marketing",
        "Data Analysis"
    );

    private static final List<String> DECLINING_SKILLS = List.of(
        "Angular",
        "Pneumatics & Hydraulics",
        "Retail Store Inventory",
        "Point of Sale Systems"
    );

    private static final Map<String, Trend> TRENDS_BY_SKILL;

    static {
        Map<String, Trend> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

        // Rising skills: 0.5 -> 1.8
        for (String skillName : RISING_SKILLS) {
            String canonicalName = SkillCatalog.byName(skillName).name();
            map.put(canonicalName, new Trend(canonicalName, 0.5, 1.8));
        }

        // Declining skills: 1.5 -> 0.4
        for (String skillName : DECLINING_SKILLS) {
            String canonicalName = SkillCatalog.byName(skillName).name();
            map.put(canonicalName, new Trend(canonicalName, 1.5, 0.4));
        }

        TRENDS_BY_SKILL = Collections.unmodifiableMap(map);
    }

    private TrendProfile() {}

    public static List<String> risingSkills() {
        return RISING_SKILLS;
    }

    public static List<String> decliningSkills() {
        return DECLINING_SKILLS;
    }

    public static boolean isTrending(String skillName) {
        return TRENDS_BY_SKILL.containsKey(skillName);
    }

    public static boolean isRising(String skillName) {
        return RISING_SKILLS.stream().anyMatch(s -> s.equalsIgnoreCase(skillName));
    }

    public static boolean isDeclining(String skillName) {
        return DECLINING_SKILLS.stream().anyMatch(s -> s.equalsIgnoreCase(skillName));
    }

    public static double tierLag(int tier) {
        return switch (tier) {
            case 1 -> 1.0;
            case 2 -> 0.7;
            case 3 -> 0.4;
            default -> throw new IllegalArgumentException("Unknown tier: " + tier);
        };
    }

    /**
     * Computes the adjusted probability for a skill in a given month and district tier.
     *
     * @param skillName name of the skill
     * @param baseProbability base probability from the role profile
     * @param monthIndex 0-indexed month within the window (0 to totalMonths - 1)
     * @param totalMonths total number of months in the window
     * @param tier district tier (1, 2, or 3)
     * @return effective probability clamped between 0.02 and 0.97
     */
    public static double calculateProbability(
        String skillName,
        double baseProbability,
        int monthIndex,
        int totalMonths,
        int tier
    ) {
        Trend trend = TRENDS_BY_SKILL.get(skillName);
        if (trend == null) {
            return baseProbability;
        }

        double t = totalMonths > 1 ? (double) monthIndex / (double) (totalMonths - 1) : 0.0;
        double multiplier = trend.startMultiplier() + t * (trend.endMultiplier() - trend.startMultiplier());
        double lag = tierLag(tier);
        double effectiveMultiplier = 1.0 + (multiplier - 1.0) * lag;

        double probability = baseProbability * effectiveMultiplier;
        return Math.max(0.02, Math.min(0.97, probability));
    }
}
