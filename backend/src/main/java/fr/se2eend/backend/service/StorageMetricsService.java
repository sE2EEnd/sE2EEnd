package fr.se2eend.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class StorageMetricsService {

    @Value("${storage.local.base-directory:./uploads}")
    private String baseDirectory;

    public Map<String, Object> getStorageMetrics() {
        File storageDir = new File(baseDirectory);

        Map<String, Object> metrics = new HashMap<>();

        metrics.put("totalSpace", storageDir.getTotalSpace());
        metrics.put("freeSpace", storageDir.getFreeSpace());
        metrics.put("usableSpace", storageDir.getUsableSpace());
        metrics.put("usedSpace", storageDir.getTotalSpace() - storageDir.getFreeSpace());

        long totalSpace = storageDir.getTotalSpace();
        long usedSpace = totalSpace - storageDir.getFreeSpace();
        double percentageUsed = totalSpace > 0 ? (usedSpace * 100.0 / totalSpace) : 0;
        metrics.put("percentageUsed", percentageUsed);

        Path storagePath = Paths.get(baseDirectory);
        if (Files.exists(storagePath)) {
            try {
                long fileCount = countFiles(storagePath);
                metrics.put("fileCount", fileCount);

                long storageSize = calculateDirectorySize(storagePath);
                metrics.put("storageSize", storageSize);
            } catch (IOException e) {
                metrics.put("fileCount", 0L);
                metrics.put("storageSize", 0L);
            }
        } else {
            metrics.put("fileCount", 0L);
            metrics.put("storageSize", 0L);
        }

        metrics.put("storagePath", storageDir.getAbsolutePath());

        return metrics;
    }

    /**
     * Count files in directory recursively.
     */
    private long countFiles(Path path) throws IOException {
        try (Stream<Path> files = Files.walk(path)) {
            return files.filter(Files::isRegularFile).count();
        }
    }

    /**
     * Calculate total size of all files in directory recursively.
     */
    private long calculateDirectorySize(Path path) throws IOException {
        try (Stream<Path> files = Files.walk(path)) {
            return files
                    .filter(Files::isRegularFile)
                    .mapToLong(p -> {
                        try {
                            return Files.size(p);
                        } catch (IOException e) {
                            return 0L;
                        }
                    })
                    .sum();
        }
    }
}
