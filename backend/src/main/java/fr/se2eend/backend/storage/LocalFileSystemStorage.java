package fr.se2eend.backend.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.OptionalLong;

/**
 * Simple local file system implementation of StorageService.
 */
public class LocalFileSystemStorage implements StorageService {

    private final Path baseDir;

    public LocalFileSystemStorage(StorageProperties props) {
        this.baseDir = Path.of(props.getBaseDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new RuntimeException("Cannot create base storage directory: " + baseDir, e);
        }
    }

    @Override
    public String save(InputStream data, long size, String suggestedName) throws IOException {
        Path target = baseDir.resolve(suggestedName).normalize();
        if (!target.startsWith(baseDir)) {
            throw new SecurityException("Invalid path: " + suggestedName);
        }
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        return baseDir.relativize(target).toString();
    }

    @Override
    public InputStream read(String storagePath) throws IOException {
        Path path = baseDir.resolve(storagePath).normalize();
        if (!path.startsWith(baseDir)) {
            throw new SecurityException("Invalid path: " + storagePath);
        }
        return Files.newInputStream(path, StandardOpenOption.READ);
    }

    @Override
    public boolean delete(String storagePath) throws IOException {
        Path path = baseDir.resolve(storagePath).normalize();
        if (!path.startsWith(baseDir)) {
            throw new SecurityException("Invalid path: " + storagePath);
        }
        return Files.deleteIfExists(path);
    }

    @Override
    public OptionalLong size(String storagePath) throws IOException {
        Path path = baseDir.resolve(storagePath).normalize();
        if (!path.startsWith(baseDir)) {
            throw new SecurityException("Invalid path: " + storagePath);
        }
        return OptionalLong.of(Files.size(path));
    }
}