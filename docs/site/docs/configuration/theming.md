---
sidebar_position: 1
---

# Theming

sE2EEnd supports branding customisation through environment variables and runtime configuration. No rebuild is needed.

## Colour scheme

Set your brand colours in `.env`:

```dotenv
THEME_COLOR_PRIMARY=#2563eb       # Main colour — buttons, sidebar, links
THEME_COLOR_PRIMARY_DARK=#1d4ed8  # Hover/active states
THEME_COLOR_PRIMARY_LIGHT=#3b82f6 # Highlights, badges
```

These colours are applied in two places:

1. **Keycloak login page** — the `generate-theme.sh` script at container startup injects the colours into the CSS template
2. **Application UI** — the backend serves these values via `GET /api/config/theme`, and the frontend applies them via CSS variables at runtime

To apply colour changes, recreate the Keycloak container (CSS is generated at startup):

```bash
docker compose up -d --force-recreate keycloak
```

The frontend picks up colour changes automatically on the next page load (no container restart needed). 

## Dark mode

The application ships with a dark theme. Users can toggle it using the sun/moon button in the top-right corner. The preference is persisted in `localStorage`.

## Keycloak login page

The custom `se2eend` Keycloak theme provides:

- Brand colour applied to buttons and accents
- Translated messages in French and English
- A clean, minimal login/register form

The theme is loaded from `keycloak/themes/se2eend/` which is volume-mounted into the Keycloak container. To customise further, edit the FreeMarker templates (`.ftl` files) and rebuild the container.
