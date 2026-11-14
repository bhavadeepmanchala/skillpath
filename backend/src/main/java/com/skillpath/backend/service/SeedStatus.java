package com.skillpath.backend.service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
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
    private final List<Runnable> cacheClearListeners = new CopyOnWriteArrayList<>();

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

    public void addCacheClearListener(Runnable listener) {
        if (listener != null) {
            this.cacheClearListeners.add(listener);
        }
    }

    public void notifyCacheClear() {
        for (Runnable listener : cacheClearListeners) {
            try {
                listener.run();
            } catch (Exception ignored) {}
        }
    }

    public boolean isSeedProfileActive() {
        return seedProfileActive;
    }

    public String getPhase() {
        return phase.get();
    }

    public void setPhase(String newPhase) {
        this.phase.set(newPhase);
        if (!PHASE_READY.equals(newPhase)) {
            notifyCacheClear();
        }
    }

    public void setReady() {
        this.phase.set(PHASE_READY);
    }

    public void setFailed() {
        this.phase.set(PHASE_FAILED);
        notifyCacheClear();
    }

    public void setSeeding() {
        this.phase.set(PHASE_SEEDING);
        notifyCacheClear();
    }
}
