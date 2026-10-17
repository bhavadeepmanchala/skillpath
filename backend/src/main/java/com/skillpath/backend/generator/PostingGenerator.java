package com.skillpath.backend.generator;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;
import java.util.TreeSet;
import org.springframework.stereotype.Component;

/**
 * Pure generator producing deterministic job postings and posting_skill associations.
 * Uses dedicated independent RNG streams per generation concern so adjustments
 * to one aspect do not perturb others.
 */
@Component
public class PostingGenerator {

    private record Cell(
        long districtId,
        String districtName,
        int districtTier,
        long roleId,
        String roleName,
        String sector,
        RoleSkillProfiles.RoleProfile profile,
        double weight
    ) {}

    private record MonthAllocation(int monthIndex, double remainder) implements Comparable<MonthAllocation> {
        @Override
        public int compareTo(MonthAllocation other) {
            // Sort by remainder descending, tie-break by monthIndex ascending
            int cmp = Double.compare(other.remainder, this.remainder);
            if (cmp != 0) {
                return cmp;
            }
            return Integer.compare(this.monthIndex, other.monthIndex);
        }
    }

    /**
     * Generates pure in-memory job postings and posting-skill associations.
     *
     * @param refData reference data containing skills, roles, and districts
     * @param seed master seed for deterministic random streams
     * @param properties generator configuration properties
     * @return populated {@link PostingData} snapshot
     */
    public PostingData generate(ReferenceData refData, long seed, GeneratorProperties properties) {
        SeededRandoms randoms = new SeededRandoms(seed);
        Random cellRandom = randoms.forStream("postings.cells");
        Random dateRandom = randoms.forStream("postings.dates");
        Random levelRandom = randoms.forStream("postings.levels");
        Random skillRandom = randoms.forStream("postings.skills");
        Random reqLevelRandom = randoms.forStream("postings.required-levels");

        LocalDate asOfDate = properties.getAsOfDate();
        int months = properties.getMonths();
        int totalPostings = properties.getTotalPostings();

        // 1. Month volumes: weight (1.015)^m, normalized. Allocate totalPostings by largest remainder
        int[] monthVolumes = calculateMonthVolumes(months, totalPostings);

        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(months - 1);

        // 2. Cell weights over (district, role)
        List<Cell> cells = buildCells(refData);
        double[] cumulativeWeights = new double[cells.size()];
        double runningSum = 0.0;
        for (int i = 0; i < cells.size(); i++) {
            runningSum += cells.get(i).weight();
            cumulativeWeights[i] = runningSum;
        }
        double totalCellWeight = runningSum;

        // Skill name -> ID mapping using TreeMap (ordered, no banned HashMap)
        Map<String, Long> skillNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.SkillRow s : refData.skills()) {
            skillNameToId.put(s.name(), s.id());
        }

        List<PostingData.JobPostingRow> postingRows = new ArrayList<>(totalPostings);
        List<PostingData.PostingSkillRow> postingSkillRows = new ArrayList<>(totalPostings * 6);

        long postingId = 1L;

        for (int m = 0; m < months; m++) {
            YearMonth currentYm = startYm.plusMonths(m);
            int postingsInMonth = monthVolumes[m];
            int daysInMonth = currentYm.lengthOfMonth();

            for (int p = 0; p < postingsInMonth; p++) {
                // 2. Sample cell
                double drawCell = cellRandom.nextDouble() * totalCellWeight;
                int cellIdx = Arrays.binarySearch(cumulativeWeights, drawCell);
                if (cellIdx < 0) {
                    cellIdx = -(cellIdx + 1);
                }
                if (cellIdx >= cells.size()) {
                    cellIdx = cells.size() - 1;
                }
                Cell cell = cells.get(cellIdx);

                // 3. posted_on: uniform day within month, clipped to asOfDate
                int day = 1 + dateRandom.nextInt(daysInMonth);
                LocalDate postedOn = currentYm.atDay(day);
                if (postedOn.isAfter(asOfDate)) {
                    postedOn = asOfDate;
                }

                // 4. level: sample from role levelMix
                RoleSkillProfiles.LevelMix levelMix = cell.profile().levelMix();
                double levelDraw = levelRandom.nextDouble();
                String level;
                if (levelDraw < levelMix.entry()) {
                    level = Levels.ENTRY;
                } else if (levelDraw < levelMix.entry() + levelMix.mid()) {
                    level = Levels.MID;
                } else {
                    level = Levels.SENIOR;
                }

                // 5. Skills: draw ONE double per profile skill in fixed order
                List<Long> includedSkillIds = new ArrayList<>();
                for (RoleSkillProfiles.SkillProbability sp : cell.profile().skills()) {
                    double drawSkill = skillRandom.nextDouble();
                    double prob = TrendProfile.calculateProbability(
                        sp.skillName(),
                        sp.baseProbability(),
                        m,
                        months,
                        cell.districtTier()
                    );
                    if (drawSkill < prob) {
                        Long sId = skillNameToId.get(sp.skillName());
                        if (sId != null) {
                            includedSkillIds.add(sId);
                        }
                    }
                }

                // Fallback if none included
                if (includedSkillIds.isEmpty()) {
                    String fallbackSkill = cell.profile().highestBaseSkill().skillName();
                    Long fallbackId = skillNameToId.get(fallbackSkill);
                    if (fallbackId != null) {
                        includedSkillIds.add(fallbackId);
                    }
                }

                // 6. required_level per included skill
                for (Long sId : includedSkillIds) {
                    double reqDraw = reqLevelRandom.nextDouble();
                    String requiredLevel = determineRequiredLevel(level, reqDraw);
                    postingSkillRows.add(new PostingData.PostingSkillRow(postingId, sId, requiredLevel));
                }

                // 7. Store posting row
                postingRows.add(new PostingData.JobPostingRow(
                    postingId,
                    cell.roleId(),
                    cell.districtId(),
                    postedOn,
                    level
                ));

                postingId++;
            }
        }

        return new PostingData(
            Collections.unmodifiableList(postingRows),
            Collections.unmodifiableList(postingSkillRows)
        );
    }

    private static int[] calculateMonthVolumes(int months, int totalPostings) {
        double[] weights = new double[months];
        double totalWeight = 0.0;
        for (int m = 0; m < months; m++) {
            weights[m] = Math.pow(1.015, m);
            totalWeight += weights[m];
        }

        int[] volumes = new int[months];
        List<MonthAllocation> remainders = new ArrayList<>(months);
        int allocated = 0;

        for (int m = 0; m < months; m++) {
            double quota = totalPostings * (weights[m] / totalWeight);
            int base = (int) Math.floor(quota);
            volumes[m] = base;
            allocated += base;
            remainders.add(new MonthAllocation(m, quota - base));
        }

        Collections.sort(remainders);
        int shortfall = totalPostings - allocated;
        for (int i = 0; i < shortfall; i++) {
            volumes[remainders.get(i).monthIndex()]++;
        }

        return volumes;
    }

    private static List<Cell> buildCells(ReferenceData refData) {
        List<Cell> cells = new ArrayList<>();

        for (ReferenceData.DistrictRow d : refData.districts()) {
            DistrictProfiles.DistrictProfile dp = DistrictProfiles.byName(d.name());
            double tierWeight = dp.tierWeight();

            for (ReferenceData.RoleRow r : refData.roles()) {
                RoleSkillProfiles.RoleProfile rp = RoleSkillProfiles.byName(r.name());
                double affinity = dp.sectorAffinity(r.sector());
                double roleWeight = rp.roleWeight();
                double cellWeight = tierWeight * affinity * roleWeight;

                cells.add(new Cell(
                    d.id(),
                    d.name(),
                    dp.tier(),
                    r.id(),
                    r.name(),
                    r.sector(),
                    rp,
                    cellWeight
                ));
            }
        }

        return cells;
    }

    private static String determineRequiredLevel(String postingLevel, double draw) {
        return switch (postingLevel) {
            case Levels.ENTRY -> draw < 0.70 ? Levels.BASIC : Levels.INTERMEDIATE;
            case Levels.MID -> {
                if (draw < 0.20) {
                    yield Levels.BASIC;
                } else if (draw < 0.80) {
                    yield Levels.INTERMEDIATE;
                } else {
                    yield Levels.ADVANCED;
                }
            }
            case Levels.SENIOR -> draw < 0.30 ? Levels.INTERMEDIATE : Levels.ADVANCED;
            default -> throw new IllegalArgumentException("Unknown posting level: " + postingLevel);
        };
    }
}
