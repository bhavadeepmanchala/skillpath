package com.skillpath.backend.service;

import com.skillpath.backend.dto.CourseOversupplyItem;
import com.skillpath.backend.dto.CourseRecommendationItem;
import com.skillpath.backend.dto.CourseRecommendationsResponse;
import com.skillpath.backend.dto.DistrictPlanConfig;
import com.skillpath.backend.dto.DistrictPlanCounts;
import com.skillpath.backend.dto.DistrictPlanCourseItem;
import com.skillpath.backend.dto.DistrictPlanResponse;
import com.skillpath.backend.dto.DistrictPlanTotals;
import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlanService {

    private final OversupplyService oversupplyService;
    private final RecommendationService recommendationService;
    private final JdbcTemplate jdbcTemplate;

    private final double targetRatio;
    private final double expandBelowRatio;
    private final double reviseCoverageThreshold;
    private final int reviseMaxSkills;
    private final int seatsPerTrainer;
    private final int minOpenings;

    @Autowired
    public PlanService(
        OversupplyService oversupplyService,
        RecommendationService recommendationService,
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.plan.target-ratio:1.0}") double targetRatio,
        @Value("${skillpath.plan.expand-below-ratio:0.7}") double expandBelowRatio,
        @Value("${skillpath.plan.revise-coverage-threshold:40.0}") double reviseCoverageThreshold,
        @Value("${skillpath.plan.revise-max-skills:3}") int reviseMaxSkills,
        @Value("${skillpath.plan.seats-per-trainer:25}") int seatsPerTrainer,
        @Value("${skillpath.flags.min-openings:20}") int minOpenings
    ) {
        this.oversupplyService = oversupplyService;
        this.recommendationService = recommendationService;
        this.jdbcTemplate = jdbcTemplate;
        this.targetRatio = targetRatio;
        this.expandBelowRatio = expandBelowRatio;
        this.reviseCoverageThreshold = reviseCoverageThreshold;
        this.reviseMaxSkills = reviseMaxSkills;
        this.seatsPerTrainer = seatsPerTrainer;
        this.minOpenings = minOpenings;
    }

    public DistrictPlanResponse getDistrictPlan(Long districtId) {
        return getDistrictPlan(districtId, null, null, null, null, null, null);
    }

    public DistrictPlanResponse getDistrictPlan(
        Long districtId,
        Double overrideTargetRatio,
        Double overrideExpandBelowRatio,
        Double overrideReviseCoverageThreshold,
        Integer overrideReviseMaxSkills,
        Integer overrideSeatsPerTrainer,
        Integer overrideMinOpenings
    ) {
        if (districtId == null) {
            throw new ResourceNotFoundException("District ID cannot be null");
        }

        String districtName;
        try {
            districtName = jdbcTemplate.queryForObject(
                "SELECT name FROM district WHERE id = ?",
                String.class,
                districtId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException("District not found: " + districtId);
        }

        if (districtName == null) {
            throw new ResourceNotFoundException("District not found: " + districtId);
        }

        double effectiveTargetRatio = (overrideTargetRatio != null) ? overrideTargetRatio : this.targetRatio;
        double effectiveExpandBelowRatio = (overrideExpandBelowRatio != null) ? overrideExpandBelowRatio : this.expandBelowRatio;
        double effectiveReviseCoverageThreshold = (overrideReviseCoverageThreshold != null) ? overrideReviseCoverageThreshold : this.reviseCoverageThreshold;
        int effectiveReviseMaxSkills = (overrideReviseMaxSkills != null) ? overrideReviseMaxSkills : this.reviseMaxSkills;
        int effectiveSeatsPerTrainer = (overrideSeatsPerTrainer != null && overrideSeatsPerTrainer > 0) ? overrideSeatsPerTrainer : this.seatsPerTrainer;
        int effectiveMinOpenings = (overrideMinOpenings != null) ? overrideMinOpenings : this.minOpenings;

        FlagsResponse flagsResp = oversupplyService.getFlags(
            districtId,
            null,
            null,
            null,
            effectiveMinOpenings,
            null
        );

        List<DistrictPlanCourseItem> planItems = new ArrayList<>();
        int countReduce = 0;
        int countRevise = 0;
        int countExpand = 0;
        int countKeep = 0;

        int totalSeats = 0;
        int totalRecommendedSeats = 0;
        int totalTrainers = 0;
        int totalTrainersNeeded = 0;

        for (CourseOversupplyItem flagItem : flagsResp.items()) {
            long courseId = flagItem.courseId();
            String courseName = flagItem.courseName();
            int seats = (flagItem.seats() != null) ? flagItem.seats() : 0;
            int trainers = (flagItem.trainers() != null) ? flagItem.trainers() : 0;
            double estimatedOpenings = (flagItem.estimatedOpenings() != null) ? flagItem.estimatedOpenings() : 0.0;
            Double ratio = flagItem.oversupplyRatio();
            double coverage = (flagItem.coverage() != null) ? flagItem.coverage() : 0.0;
            double keySkillTrend = (flagItem.keySkillTrend() != null) ? flagItem.keySkillTrend() : 0.0;
            boolean oversupplied = Boolean.TRUE.equals(flagItem.oversupplied());
            boolean obsolete = Boolean.TRUE.equals(flagItem.obsolete());

            List<String> actions = new ArrayList<>();
            List<String> reasons = new ArrayList<>();
            int recommendedSeats;
            int trainersNeeded;
            List<CourseRecommendationItem> add = List.of();
            List<CourseRecommendationItem> retire = List.of();

            // Rule 1: INSUFFICIENT_DATA
            if (estimatedOpenings < effectiveMinOpenings) {
                actions.add("KEEP");
                reasons.add("INSUFFICIENT_DATA");
                recommendedSeats = seats;
                trainersNeeded = trainers;
            } else {
                // Rule 2: REDUCE
                boolean reduceApplies = oversupplied;
                if (reduceApplies) {
                    actions.add("REDUCE");
                    reasons.add("OVERSUPPLIED");
                }

                // Rule 3: REVISE
                boolean reviseApplies = obsolete || (coverage < effectiveReviseCoverageThreshold);
                if (reviseApplies) {
                    actions.add("REVISE");
                    if (obsolete) {
                        reasons.add("OBSOLETE");
                    } else {
                        reasons.add("LOW_COVERAGE");
                    }
                    try {
                        CourseRecommendationsResponse recResp = recommendationService.getRecommendations(
                            courseId,
                            districtId,
                            effectiveReviseMaxSkills,
                            null,
                            null,
                            null
                        );
                        if (recResp.add() != null) {
                            add = recResp.add();
                        }
                        if (recResp.retire() != null) {
                            retire = recResp.retire();
                        }
                    } catch (Exception e) {
                        // ignore recommendation failure
                    }
                }

                // Rule 4: EXPAND
                boolean expandApplies = !oversupplied && (ratio != null && ratio < effectiveExpandBelowRatio);
                if (expandApplies) {
                    actions.add("EXPAND");
                    reasons.add("UNDER_SUPPLIED");
                }

                // Recommended seats
                if (reduceApplies || expandApplies) {
                    recommendedSeats = (int) Math.max(0, Math.ceil(estimatedOpenings * effectiveTargetRatio));
                } else {
                    recommendedSeats = seats;
                }

                // Rule 5: KEEP
                if (actions.isEmpty()) {
                    actions.add("KEEP");
                    reasons.add("WITHIN_RANGE");
                }

                if (recommendedSeats == seats) {
                    trainersNeeded = trainers;
                } else if (actions.contains("EXPAND")) {
                    int calc = (int) Math.max(0, Math.ceil((double) recommendedSeats / effectiveSeatsPerTrainer));
                    trainersNeeded = Math.max(trainers, calc);
                } else {
                    trainersNeeded = (int) Math.max(0, Math.ceil((double) recommendedSeats / effectiveSeatsPerTrainer));
                }
            }

            int seatChange = recommendedSeats - seats;
            int trainerChange = trainersNeeded - trainers;

            if (actions.contains("REDUCE")) countReduce++;
            if (actions.contains("REVISE")) countRevise++;
            if (actions.contains("EXPAND")) countExpand++;
            if (actions.contains("KEEP")) countKeep++;

            totalSeats += seats;
            totalRecommendedSeats += recommendedSeats;
            totalTrainers += trainers;
            totalTrainersNeeded += trainersNeeded;

            planItems.add(new DistrictPlanCourseItem(
                courseId,
                courseName,
                seats,
                trainers,
                estimatedOpenings,
                ratio,
                coverage,
                keySkillTrend,
                oversupplied,
                obsolete,
                actions,
                reasons,
                recommendedSeats,
                seatChange,
                trainersNeeded,
                trainerChange,
                add,
                retire
            ));
        }

        // Sort: actions priority (REDUCE, REVISE, EXPAND, KEEP), then ratio descending, then courseId ascending
        planItems.sort(
            Comparator.comparingInt(this::getActionPriority)
                .thenComparing(
                    DistrictPlanCourseItem::ratio,
                    Comparator.nullsLast(Comparator.reverseOrder())
                )
                .thenComparing(DistrictPlanCourseItem::courseId)
        );

        DistrictPlanCounts counts = new DistrictPlanCounts(countReduce, countRevise, countExpand, countKeep);
        DistrictPlanTotals totals = new DistrictPlanTotals(
            totalSeats,
            totalRecommendedSeats,
            totalTrainers,
            totalTrainersNeeded,
            totalTrainersNeeded - totalTrainers
        );
        DistrictPlanConfig config = new DistrictPlanConfig(
            effectiveTargetRatio,
            effectiveExpandBelowRatio,
            effectiveReviseCoverageThreshold,
            effectiveReviseMaxSkills,
            effectiveSeatsPerTrainer,
            effectiveMinOpenings
        );

        return new DistrictPlanResponse(
            districtId,
            districtName,
            planItems,
            counts,
            totals,
            true,
            config
        );
    }

    private int getActionPriority(DistrictPlanCourseItem item) {
        List<String> actions = item.actions();
        if (actions.contains("REDUCE")) return 1;
        if (actions.contains("REVISE")) return 2;
        if (actions.contains("EXPAND")) return 3;
        return 4; // KEEP
    }
}
