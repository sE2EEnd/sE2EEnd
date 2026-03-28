package fr.se2eend.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "instance_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InstanceSetting {

    @Id
    private String key;

    @Column(nullable = false)
    private String value;
}
