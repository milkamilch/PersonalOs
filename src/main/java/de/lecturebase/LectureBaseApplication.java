package de.lecturebase;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LectureBaseApplication {

    public static void main(String[] args) {
        SpringApplication.run(LectureBaseApplication.class, args);
    }
}
