package com.skillpath.backend.generator;

import java.time.LocalDate;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "skillpath.generator")
public class GeneratorProperties {

    private long seed = 42L;
    private LocalDate asOfDate = LocalDate.of(2026, 9, 30);
    private int months = 18;
    private int totalPostings = 40000;

    public long getSeed() {
        return seed;
    }

    public void setSeed(long seed) {
        this.seed = seed;
    }

    public LocalDate getAsOfDate() {
        return asOfDate;
    }

    public void setAsOfDate(LocalDate asOfDate) {
        this.asOfDate = asOfDate;
    }

    public int getMonths() {
        return months;
    }

    public void setMonths(int months) {
        this.months = months;
    }

    public int getTotalPostings() {
        return totalPostings;
    }

    public void setTotalPostings(int totalPostings) {
        this.totalPostings = totalPostings;
    }
}

