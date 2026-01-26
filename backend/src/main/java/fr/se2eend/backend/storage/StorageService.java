package fr.se2eend.backend.storage;

import java.io.IOException;
import java.io.InputStream;
import java.util.OptionalLong;

public interface StorageService {

    String save(InputStream data, long contentLength, String suggestedName) throws IOException;

    InputStream read(String storagePath) throws IOException;

    boolean delete(String storagePath) throws IOException;

    OptionalLong size(String storagePath) throws IOException;
}

