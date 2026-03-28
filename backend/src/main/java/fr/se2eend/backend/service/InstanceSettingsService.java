package fr.se2eend.backend.service;

import fr.se2eend.backend.model.InstanceSetting;
import fr.se2eend.backend.repository.InstanceSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstanceSettingsService {

    private final InstanceSettingRepository repository;

    public String get(String key, String defaultValue) {
        return repository.findById(key)
                .map(InstanceSetting::getValue)
                .orElse(defaultValue);
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        return Boolean.parseBoolean(get(key, String.valueOf(defaultValue)));
    }

    public void set(String key, String value) {
        InstanceSetting setting = repository.findById(key)
                .orElse(new InstanceSetting(key, value));
        setting.setValue(value);
        repository.save(setting);
    }

    public Map<String, String> getAll() {
        return repository.findAll().stream()
                .collect(Collectors.toMap(InstanceSetting::getKey, InstanceSetting::getValue));
    }
}
