package de.lecturebase.service;

import de.lecturebase.repository.FitnessRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class FitnessService {

    private final FitnessRepository repo;

    public FitnessService(FitnessRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> workouts(int limit) { return repo.findWorkouts(limit); }

    @SuppressWarnings("unchecked")
    public Map<String, Object> createWorkout(Map<String, Object> body) {
        long id = repo.createWorkout(
            (String) body.getOrDefault("name", "Training"),
            (String) body.getOrDefault("notes", ""),
            (String) body.getOrDefault("workoutDate", LocalDate.now().toString()));
        List<Map<String, Object>> exercises =
            (List<Map<String, Object>>) body.getOrDefault("exercises", List.of());
        for (Map<String, Object> ex : exercises) addExercise(id, ex);
        return repo.findWorkoutWithExercises(id);
    }

    public Map<String, Object> addExercise(long workoutId, Map<String, Object> ex) {
        repo.addExercise(workoutId,
            (String) ex.getOrDefault("name", "Übung"),
            ((Number) ex.getOrDefault("sets", 0)).intValue(),
            ((Number) ex.getOrDefault("reps", 0)).intValue(),
            ((Number) ex.getOrDefault("weightKg", 0)).doubleValue(),
            ((Number) ex.getOrDefault("durationMin", 0)).intValue());
        return repo.findWorkoutWithExercises(workoutId);
    }

    public void deleteWorkout(long id) { repo.deleteWorkout(id); }

    public Map<String, Object> stats() {
        return Map.of(
            "totalWorkouts", repo.countWorkouts(),
            "thisMonth",     repo.countWorkoutsThisMonth(),
            "thisWeek",      repo.countWorkoutsThisWeek(),
            "lastWorkout",   repo.lastWorkoutDate());
    }

    public List<Map<String, Object>> weightLog(int days) { return repo.findWeightLog(days); }

    public Map<String, Object> logWeight(Map<String, Object> body) {
        return repo.logWeight(
            (String) body.getOrDefault("logDate", LocalDate.now().toString()),
            ((Number) body.getOrDefault("weightKg", 0)).doubleValue(),
            (String) body.getOrDefault("note", ""));
    }

    public void deleteWeight(long id) { repo.deleteWeight(id); }
}
