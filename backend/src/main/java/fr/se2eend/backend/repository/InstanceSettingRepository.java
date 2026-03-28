package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.InstanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstanceSettingRepository extends JpaRepository<InstanceSetting, String> {
}
