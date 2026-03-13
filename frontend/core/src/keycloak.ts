import Keycloak from 'keycloak-js';
import { config } from './config';

const keycloak = new Keycloak({
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
});

export default keycloak;
