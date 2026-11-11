package com.skillpath.backend.service;

import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class SeedStatus {

    public static final String PHASE_SEEDING = "seeding";
    public static final String PHASE_READY = "ready";
    public static final String PHASE_FAILED = "failed";
    public static final String PHASE_EMPTY = "empty";

    private final boolean seedProfileActive;
    private final AtomicReference<String> phase;

    @Autowired
    public SeedStatus(Environment environment) {
        this.seedProfileActive = environment != null && environment.acceptsProfiles(Profiles.of("seed"));
        if (this.seedProfileActive) {
            this.phase = new AtomicReference<>(PHASE_SEEDING);
        } else {
            this.phase = new AtomicReference<>(PHASE_EMPTY);
        }
    }

    public SeedStatus(boolean seedProfileActive, String initialPhase) {
        this.seedProfileActive = seedProfileActive;
        this.phase = new AtomicReference<>(initialPhase);
    }

    public boolean isSeedProfileActive() {
        return seedProfileActive;
    }

    public String getPhase() {
        return phase.get();
    }

    public void setPhase(String newPhase) {
        this.phase.set(newPhase);
    }

    public void setReady() {
        this.phase.set(PHASE_READY);
    }

    public void setFailed() {
        this.phase.set(PHASE_FAILED);
    }

    public void setSeeding() {
        this.phase.set(PHASE_SEEDING);
    }
}
