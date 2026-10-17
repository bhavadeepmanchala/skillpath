package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

class PostingGeneratorUnitTest {

    @Test
    void invariantsSatisfied() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();

        PostingData data = generator.generate(refData, 42L, properties);

        // Exactly totalPostings postings (40,000)
        assertThat(data.postings()).hasSize(properties.getTotalPostings());

        LocalDate asOfDate = properties.getAsOfDate();
        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(properties.getMonths() - 1);
        LocalDate earliestDate = startYm.atDay(1);

        Set<Long> validRoleIds = new TreeSet<>();
        for (ReferenceData.RoleRow r : refData.roles()) {
            validRoleIds.add(r.id());
        }
        Set<Long> validDistrictIds = new TreeSet<>();
        for (ReferenceData.DistrictRow d : refData.districts()) {
            validDistrictIds.add(d.id());
        }
        Set<Long> validSkillIds = new TreeSet<>();
        for (ReferenceData.SkillRow s : refData.skills()) {
            validSkillIds.add(s.id());
        }

        Map<Long, Integer> postingSkillCounts = new TreeMap<>();
        Set<String> uniquePostingSkills = new TreeSet<>();

        for (PostingData.JobPostingRow p : data.postings()) {
            // Sequential IDs starting at 1
            assertThat(p.id()).isGreaterThan(0L).isLessThanOrEqualTo(properties.getTotalPostings());

            // Dates within window and <= asOfDate
            assertThat(p.postedOn())
                .isAfterOrEqualTo(earliestDate)
                .isBeforeOrEqualTo(asOfDate);

            // Valid FK IDs
            assertThat(validRoleIds).contains(p.roleId());
            assertThat(validDistrictIds).contains(p.districtId());

            // Valid level
            assertThat(Levels.POSTING_LEVELS).contains(p.level());
        }

        for (PostingData.PostingSkillRow ps : data.postingSkills()) {
            assertThat(validSkillIds).contains(ps.skillId());
            assertThat(Levels.REQUIRED_LEVELS).contains(ps.requiredLevel());

            postingSkillCounts.merge(ps.postingId(), 1, Integer::sum);

            String key = ps.postingId() + "#" + ps.skillId();
            assertThat(uniquePostingSkills.add(key))
                .as("Duplicate (posting, skill) association: %s", key)
                .isTrue();
        }

        // Every posting has >= 1 skill
        for (PostingData.JobPostingRow p : data.postings()) {
            assertThat(postingSkillCounts.get(p.id()))
                .as("Posting %d has no associated skills", p.id())
                .isNotNull()
                .isGreaterThanOrEqualTo(1);
        }

        // Months sum correctly
        Map<String, Integer> postingsPerMonth = new TreeMap<>();
        for (PostingData.JobPostingRow p : data.postings()) {
            String month = YearMonth.from(p.postedOn()).toString();
            postingsPerMonth.merge(month, 1, Integer::sum);
        }
        assertThat(postingsPerMonth).hasSize(properties.getMonths());
        int sumPostings = postingsPerMonth.values().stream().mapToInt(Integer::intValue).sum();
        assertThat(sumPostings).isEqualTo(properties.getTotalPostings());
    }

    @Test
    void profilesValidation() {
        // 1. Every district has a DistrictProfile
        List<DistrictCatalog.DistrictDef> allDistricts = DistrictCatalog.all();
        assertThat(allDistricts).hasSize(40);

        for (DistrictCatalog.DistrictDef d : allDistricts) {
            DistrictProfiles.DistrictProfile dp = DistrictProfiles.byName(d.name());
            assertThat(dp).isNotNull();
            assertThat(dp.tier()).isBetween(1, 3);
            assertThat(dp.strongSectors()).hasSizeBetween(2, 3);
            for (String sector : dp.strongSectors()) {
                assertThat(Sectors.ALL).contains(sector);
            }
        }

        // 2. Every skill appears in >= 1 role profile
        Set<String> profiledSkills = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (RoleSkillProfiles.RoleProfile rp : RoleSkillProfiles.all()) {
            for (RoleSkillProfiles.SkillProbability sp : rp.skills()) {
                profiledSkills.add(sp.skillName());
            }
        }
        for (SkillCatalog.SkillDef sd : SkillCatalog.all()) {
            assertThat(profiledSkills)
                .as("Skill '%s' must appear in at least one role profile", sd.name())
                .contains(sd.name());
        }

        // 3. Every trend skill is common-tier somewhere
        List<String> allTrendSkills = new ArrayList<>();
        allTrendSkills.addAll(TrendProfile.risingSkills());
        allTrendSkills.addAll(TrendProfile.decliningSkills());

        for (String trendSkill : allTrendSkills) {
            boolean foundCommon = false;
            for (RoleSkillProfiles.RoleProfile rp : RoleSkillProfiles.all()) {
                for (RoleSkillProfiles.SkillProbability sp : rp.skills()) {
                    if (sp.skillName().equalsIgnoreCase(trendSkill)
                            && sp.tier() == RoleSkillProfiles.Tier.COMMON
                            && sp.baseProbability() >= 0.30
                            && sp.baseProbability() <= 0.55) {
                        foundCommon = true;
                        break;
                    }
                }
            }
            assertThat(foundCommon)
                .as("Trend skill '%s' must be in COMMON tier with base probability in [0.30, 0.55]", trendSkill)
                .isTrue();
        }
    }

    @Test
    void trendSignalValidation() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();
        PostingData data = generator.generate(refData, 42L, properties);

        LocalDate asOfDate = properties.getAsOfDate();
        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(properties.getMonths() - 1);

        // Map postingId -> (roleId, monthIndex)
        record PostInfo(long roleId, int monthIndex) {}
        Map<Long, PostInfo> postingInfoMap = new TreeMap<>();
        for (PostingData.JobPostingRow p : data.postings()) {
            YearMonth ym = YearMonth.from(p.postedOn());
            int monthIndex = (ym.getYear() - startYm.getYear()) * 12 + (ym.getMonthValue() - startYm.getMonthValue());
            postingInfoMap.put(p.id(), new PostInfo(p.roleId(), monthIndex));
        }

        // Map skillId -> skillName
        Map<Long, String> skillIdToName = new TreeMap<>();
        for (ReferenceData.SkillRow s : refData.skills()) {
            skillIdToName.put(s.id(), s.name());
        }

        // Map skillName -> Set of roleIds where skill is in the profile
        Map<String, Set<Long>> skillProfiledRoles = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        Map<String, Long> roleNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.RoleRow r : refData.roles()) {
            roleNameToId.put(r.name(), r.id());
        }
        for (RoleSkillProfiles.RoleProfile rp : RoleSkillProfiles.all()) {
            long rId = roleNameToId.get(rp.roleName());
            for (RoleSkillProfiles.SkillProbability sp : rp.skills()) {
                skillProfiledRoles.computeIfAbsent(sp.skillName(), k -> new TreeSet<>()).add(rId);
            }
        }

        // Track postings containing each skill in (first 3 months vs last 3 months)
        Map<Long, Set<Long>> postingSkillsMap = new TreeMap<>();
        for (PostingData.PostingSkillRow ps : data.postingSkills()) {
            postingSkillsMap.computeIfAbsent(ps.postingId(), k -> new TreeSet<>()).add(ps.skillId());
        }

        // Map skillName -> skillId
        Map<String, Long> skillNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.SkillRow s : refData.skills()) {
            skillNameToId.put(s.name(), s.id());
        }

        // Measure share change for each skill across its profiled roles
        Map<String, Double> shareChanges = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

        for (SkillCatalog.SkillDef skillDef : SkillCatalog.all()) {
            String skillName = skillDef.name();
            Long skillId = skillNameToId.get(skillName);
            Set<Long> rolesForSkill = skillProfiledRoles.get(skillName);
            if (rolesForSkill == null || rolesForSkill.isEmpty()) {
                continue;
            }

            int first3RolePostings = 0;
            int first3SkillPostings = 0;
            int last3RolePostings = 0;
            int last3SkillPostings = 0;

            for (PostingData.JobPostingRow p : data.postings()) {
                if (!rolesForSkill.contains(p.roleId())) {
                    continue;
                }
                PostInfo info = postingInfoMap.get(p.id());
                boolean hasSkill = postingSkillsMap.getOrDefault(p.id(), Collections.emptySet()).contains(skillId);

                if (info.monthIndex() <= 2) {
                    first3RolePostings++;
                    if (hasSkill) {
                        first3SkillPostings++;
                    }
                } else if (info.monthIndex() >= 15) {
                    last3RolePostings++;
                    if (hasSkill) {
                        last3SkillPostings++;
                    }
                }
            }

            double firstShare = first3RolePostings > 0 ? (double) first3SkillPostings / first3RolePostings : 0.0;
            double lastShare = last3RolePostings > 0 ? (double) last3SkillPostings / last3RolePostings : 0.0;
            double diff = lastShare - firstShare;
            shareChanges.put(skillName, diff);
        }

        // Check rising skills: share is >= 15 percentage points higher in last 3 months than first 3
        for (String risingSkill : TrendProfile.risingSkills()) {
            Double change = shareChanges.get(risingSkill);
            assertThat(change)
                .as("Rising skill '%s' share gain should be >= +0.15", risingSkill)
                .isNotNull()
                .isGreaterThanOrEqualTo(0.15);
        }

        // Check declining skills: share is >= 15 percentage points lower
        for (String decliningSkill : TrendProfile.decliningSkills()) {
            Double change = shareChanges.get(decliningSkill);
            assertThat(change)
                .as("Declining skill '%s' share change should be <= -0.15", decliningSkill)
                .isNotNull()
                .isLessThanOrEqualTo(-0.15);
        }

        // Median absolute change across non-trend skills is < 0.03
        List<Double> nonTrendAbsChanges = new ArrayList<>();
        for (Map.Entry<String, Double> entry : shareChanges.entrySet()) {
            if (!TrendProfile.isTrending(entry.getKey())) {
                nonTrendAbsChanges.add(Math.abs(entry.getValue()));
            }
        }
        Collections.sort(nonTrendAbsChanges);
        double medianChange = nonTrendAbsChanges.get(nonTrendAbsChanges.size() / 2);
        assertThat(medianChange)
            .as("Median absolute share change across non-trend skills must be < 0.03")
            .isLessThan(0.03);
    }

    @Test
    void volumeGrowthValidation() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();
        PostingData data = generator.generate(refData, 42L, properties);

        LocalDate asOfDate = properties.getAsOfDate();
        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(properties.getMonths() - 1);

        int first3Count = 0;
        int last3Count = 0;

        for (PostingData.JobPostingRow p : data.postings()) {
            YearMonth ym = YearMonth.from(p.postedOn());
            int m = (ym.getYear() - startYm.getYear()) * 12 + (ym.getMonthValue() - startYm.getMonthValue());
            if (m <= 2) {
                first3Count++;
            } else if (m >= 15) {
                last3Count++;
            }
        }

        double growth = (double) (last3Count - first3Count) / first3Count;
        assertThat(growth)
            .as("Last 3 months volume must exceed first 3 months volume by >= 10%%")
            .isGreaterThanOrEqualTo(0.10);
    }

    @Test
    void geographyDistributionValidation() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();
        PostingData data = generator.generate(refData, 42L, properties);

        LocalDate asOfDate = properties.getAsOfDate();
        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(properties.getMonths() - 1);

        Map<Long, String> roleIdToSector = new TreeMap<>();
        for (ReferenceData.RoleRow r : refData.roles()) {
            roleIdToSector.put(r.id(), r.sector());
        }

        Map<Long, ReferenceData.DistrictRow> districtMap = new TreeMap<>();
        for (ReferenceData.DistrictRow d : refData.districts()) {
            districtMap.put(d.id(), d);
        }

        Map<Long, Integer> postingsPerDistrict = new TreeMap<>();
        Map<Long, Integer> strongSectorPostings = new TreeMap<>();

        for (PostingData.JobPostingRow p : data.postings()) {
            postingsPerDistrict.merge(p.districtId(), 1, Integer::sum);
            ReferenceData.DistrictRow d = districtMap.get(p.districtId());
            DistrictProfiles.DistrictProfile dp = DistrictProfiles.byName(d.name());
            String roleSector = roleIdToSector.get(p.roleId());
            if (dp.strongSectors().contains(roleSector)) {
                strongSectorPostings.merge(p.districtId(), 1, Integer::sum);
            }
        }

        // 1. Every district with >= 100 postings has >= 50% in strong sectors
        for (Map.Entry<Long, Integer> entry : postingsPerDistrict.entrySet()) {
            long dId = entry.getKey();
            int total = entry.getValue();
            if (total >= 100) {
                int strong = strongSectorPostings.getOrDefault(dId, 0);
                double pct = (double) strong / total;
                assertThat(pct)
                    .as("District %s strong sector share should be >= 50%%", districtMap.get(dId).name())
                    .isGreaterThanOrEqualTo(0.50);
            }
        }

        // 2. Mean postings per tier-1 district > 3x mean per tier-3 district
        int tier1Count = 0;
        int tier1Postings = 0;
        int tier3Count = 0;
        int tier3Postings = 0;

        for (ReferenceData.DistrictRow d : refData.districts()) {
            DistrictProfiles.DistrictProfile dp = DistrictProfiles.byName(d.name());
            int count = postingsPerDistrict.getOrDefault(d.id(), 0);
            if (dp.tier() == 1) {
                tier1Count++;
                tier1Postings += count;
            } else if (dp.tier() == 3) {
                tier3Count++;
                tier3Postings += count;
            }
        }

        double meanTier1 = (double) tier1Postings / tier1Count;
        double meanTier3 = (double) tier3Postings / tier3Count;
        assertThat(meanTier1 / meanTier3)
            .as("Mean postings per tier-1 district should be > 3x mean per tier-3 district")
            .isGreaterThan(3.0);

        // 3. For at least 3 rising skills the share gain is larger in tier 1 than tier 3
        Map<Long, Integer> districtTierMap = new TreeMap<>();
        for (ReferenceData.DistrictRow d : refData.districts()) {
            districtTierMap.put(d.id(), DistrictProfiles.byName(d.name()).tier());
        }

        Map<Long, Set<Long>> postingSkills = new TreeMap<>();
        for (PostingData.PostingSkillRow ps : data.postingSkills()) {
            postingSkills.computeIfAbsent(ps.postingId(), k -> new TreeSet<>()).add(ps.skillId());
        }

        Map<String, Long> skillNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.SkillRow s : refData.skills()) {
            skillNameToId.put(s.name(), s.id());
        }

        int largerGainCount = 0;

        for (String risingSkill : TrendProfile.risingSkills()) {
            Long skillId = skillNameToId.get(risingSkill);

            int t1FirstPostings = 0, t1FirstSkill = 0;
            int t1LastPostings = 0, t1LastSkill = 0;
            int t3FirstPostings = 0, t3FirstSkill = 0;
            int t3LastPostings = 0, t3LastSkill = 0;

            for (PostingData.JobPostingRow p : data.postings()) {
                int tier = districtTierMap.get(p.districtId());
                if (tier != 1 && tier != 3) {
                    continue;
                }

                YearMonth ym = YearMonth.from(p.postedOn());
                int m = (ym.getYear() - startYm.getYear()) * 12 + (ym.getMonthValue() - startYm.getMonthValue());
                boolean hasSkill = postingSkills.getOrDefault(p.id(), Collections.emptySet()).contains(skillId);

                if (tier == 1) {
                    if (m <= 2) {
                        t1FirstPostings++;
                        if (hasSkill) t1FirstSkill++;
                    } else if (m >= 15) {
                        t1LastPostings++;
                        if (hasSkill) t1LastSkill++;
                    }
                } else {
                    if (m <= 2) {
                        t3FirstPostings++;
                        if (hasSkill) t3FirstSkill++;
                    } else if (m >= 15) {
                        t3LastPostings++;
                        if (hasSkill) t3LastSkill++;
                    }
                }
            }

            double t1Gain = ((double) t1LastSkill / t1LastPostings) - ((double) t1FirstSkill / t1FirstPostings);
            double t3Gain = ((double) t3LastSkill / t3LastPostings) - ((double) t3FirstSkill / t3FirstPostings);

            if (t1Gain > t3Gain) {
                largerGainCount++;
            }
        }

        assertThat(largerGainCount)
            .as("At least 3 rising skills should have larger share gain in tier 1 than tier 3")
            .isGreaterThanOrEqualTo(3);
    }

    @Test
    void printReportMetrics() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();
        PostingData data = generator.generate(refData, 42L, properties);

        LocalDate asOfDate = properties.getAsOfDate();
        YearMonth endYm = YearMonth.from(asOfDate);
        YearMonth startYm = endYm.minusMonths(properties.getMonths() - 1);

        record PostInfo(long roleId, int monthIndex, int tier) {}
        Map<Long, PostInfo> postingInfoMap = new TreeMap<>();
        Map<Long, Integer> districtTierMap = new TreeMap<>();
        for (ReferenceData.DistrictRow d : refData.districts()) {
            districtTierMap.put(d.id(), DistrictProfiles.byName(d.name()).tier());
        }

        for (PostingData.JobPostingRow p : data.postings()) {
            YearMonth ym = YearMonth.from(p.postedOn());
            int monthIndex = (ym.getYear() - startYm.getYear()) * 12 + (ym.getMonthValue() - startYm.getMonthValue());
            postingInfoMap.put(p.id(), new PostInfo(p.roleId(), monthIndex, districtTierMap.get(p.districtId())));
        }

        Map<Long, Set<Long>> postingSkillsMap = new TreeMap<>();
        for (PostingData.PostingSkillRow ps : data.postingSkills()) {
            postingSkillsMap.computeIfAbsent(ps.postingId(), k -> new TreeSet<>()).add(ps.skillId());
        }

        Map<String, Long> skillNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.SkillRow s : refData.skills()) {
            skillNameToId.put(s.name(), s.id());
        }

        Map<String, Set<Long>> skillProfiledRoles = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        Map<String, Long> roleNameToId = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (ReferenceData.RoleRow r : refData.roles()) {
            roleNameToId.put(r.name(), r.id());
        }
        for (RoleSkillProfiles.RoleProfile rp : RoleSkillProfiles.all()) {
            long rId = roleNameToId.get(rp.roleName());
            for (RoleSkillProfiles.SkillProbability sp : rp.skills()) {
                skillProfiledRoles.computeIfAbsent(sp.skillName(), k -> new TreeSet<>()).add(rId);
            }
        }

        System.out.println("=== MEASURED TREND SIGNAL NUMBERS (Seed 42) ===");
        System.out.println("--- Rising Skills ---");
        for (String skill : TrendProfile.risingSkills()) {
            Long sId = skillNameToId.get(skill);
            Set<Long> roles = skillProfiledRoles.get(skill);
            int fPost = 0, fSkill = 0, lPost = 0, lSkill = 0;
            int t1fPost = 0, t1fSkill = 0, t1lPost = 0, t1lSkill = 0;
            int t3fPost = 0, t3fSkill = 0, t3lPost = 0, t3lSkill = 0;

            for (PostingData.JobPostingRow p : data.postings()) {
                if (!roles.contains(p.roleId())) continue;
                PostInfo info = postingInfoMap.get(p.id());
                boolean has = postingSkillsMap.getOrDefault(p.id(), Collections.emptySet()).contains(sId);
                if (info.monthIndex() <= 2) {
                    fPost++;
                    if (has) fSkill++;
                    if (info.tier() == 1) { t1fPost++; if (has) t1fSkill++; }
                    if (info.tier() == 3) { t3fPost++; if (has) t3fSkill++; }
                } else if (info.monthIndex() >= 15) {
                    lPost++;
                    if (has) lSkill++;
                    if (info.tier() == 1) { t1lPost++; if (has) t1lSkill++; }
                    if (info.tier() == 3) { t3lPost++; if (has) t3lSkill++; }
                }
            }
            double fShare = (double) fSkill / fPost;
            double lShare = (double) lSkill / lPost;
            double change = lShare - fShare;
            double t1Gain = ((double) t1lSkill / t1lPost) - ((double) t1fSkill / t1fPost);
            double t3Gain = ((double) t3lSkill / t3lPost) - ((double) t3fSkill / t3fPost);
            System.out.printf("  %s: first 3m = %.3f, last 3m = %.3f, change = %+.3f (Tier 1 gain = %+.3f, Tier 3 gain = %+.3f)%n",
                skill, fShare, lShare, change, t1Gain, t3Gain);
        }

        System.out.println("--- Declining Skills ---");
        for (String skill : TrendProfile.decliningSkills()) {
            Long sId = skillNameToId.get(skill);
            Set<Long> roles = skillProfiledRoles.get(skill);
            int fPost = 0, fSkill = 0, lPost = 0, lSkill = 0;
            int t1fPost = 0, t1fSkill = 0, t1lPost = 0, t1lSkill = 0;
            int t3fPost = 0, t3fSkill = 0, t3lPost = 0, t3lSkill = 0;

            for (PostingData.JobPostingRow p : data.postings()) {
                if (!roles.contains(p.roleId())) continue;
                PostInfo info = postingInfoMap.get(p.id());
                boolean has = postingSkillsMap.getOrDefault(p.id(), Collections.emptySet()).contains(sId);
                if (info.monthIndex() <= 2) {
                    fPost++;
                    if (has) fSkill++;
                    if (info.tier() == 1) { t1fPost++; if (has) t1fSkill++; }
                    if (info.tier() == 3) { t3fPost++; if (has) t3fSkill++; }
                } else if (info.monthIndex() >= 15) {
                    lPost++;
                    if (has) lSkill++;
                    if (info.tier() == 1) { t1lPost++; if (has) t1lSkill++; }
                    if (info.tier() == 3) { t3lPost++; if (has) t3lSkill++; }
                }
            }
            double fShare = (double) fSkill / fPost;
            double lShare = (double) lSkill / lPost;
            double change = lShare - fShare;
            double t1Gain = ((double) t1lSkill / t1lPost) - ((double) t1fSkill / t1fPost);
            double t3Gain = ((double) t3lSkill / t3lPost) - ((double) t3fSkill / t3fPost);
            System.out.printf("  %s: first 3m = %.3f, last 3m = %.3f, change = %+.3f (Tier 1 drop = %+.3f, Tier 3 drop = %+.3f)%n",
                skill, fShare, lShare, change, t1Gain, t3Gain);
        }

        List<Double> nonTrendAbs = new ArrayList<>();
        for (SkillCatalog.SkillDef sd : SkillCatalog.all()) {
            if (TrendProfile.isTrending(sd.name())) continue;
            Long sId = skillNameToId.get(sd.name());
            Set<Long> roles = skillProfiledRoles.get(sd.name());
            if (roles == null || roles.isEmpty()) continue;
            int fPost = 0, fSkill = 0, lPost = 0, lSkill = 0;
            for (PostingData.JobPostingRow p : data.postings()) {
                if (!roles.contains(p.roleId())) continue;
                PostInfo info = postingInfoMap.get(p.id());
                boolean has = postingSkillsMap.getOrDefault(p.id(), Collections.emptySet()).contains(sId);
                if (info.monthIndex() <= 2) {
                    fPost++; if (has) fSkill++;
                } else if (info.monthIndex() >= 15) {
                    lPost++; if (has) lSkill++;
                }
            }
            double fShare = (double) fSkill / fPost;
            double lShare = (double) lSkill / lPost;
            nonTrendAbs.add(Math.abs(lShare - fShare));
        }
        Collections.sort(nonTrendAbs);
        double median = nonTrendAbs.get(nonTrendAbs.size() / 2);
        System.out.printf("--- Non-Trend Skills Median Absolute Change: %.4f ---%n", median);
    }

    @Test
    void determinismValidation() {
        DataGenerator dataGenerator = new DataGenerator(null);
        ReferenceData refData = dataGenerator.generateReferenceData();
        GeneratorProperties properties = new GeneratorProperties();
        PostingGenerator generator = new PostingGenerator();

        PostingData data1 = generator.generate(refData, 42L, properties);
        PostingData data2 = generator.generate(refData, 42L, properties);
        PostingData data3 = generator.generate(refData, 99L, properties);

        assertThat(data1).isEqualTo(data2);
        assertThat(data1.postings()).isEqualTo(data2.postings());
        assertThat(data1.postingSkills()).isEqualTo(data2.postingSkills());

        assertThat(data1.postings()).isNotEqualTo(data3.postings());
    }
}
