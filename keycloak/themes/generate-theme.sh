#!/bin/bash
set -e

# Theme Generation Script for sE2EEnd Keycloak
# Generates login.css from login.css.template using environment variables

THEME_DIR="/opt/keycloak/themes/se2eend/login/resources/css"
TEMPLATE_FILE="${THEME_DIR}/login.css.template"
OUTPUT_FILE="${THEME_DIR}/login.css"

echo "==================================="
echo "sE2EEnd Keycloak Theme Generator"
echo "==================================="

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "ERROR: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

export THEME_COLOR_PRIMARY="${THEME_COLOR_PRIMARY:-#2563eb}"
export THEME_COLOR_PRIMARY_DARK="${THEME_COLOR_PRIMARY_DARK:-#1d4ed8}"
export THEME_COLOR_PRIMARY_LIGHT="${THEME_COLOR_PRIMARY_LIGHT:-#3b82f6}"

echo "Theme Configuration:"
echo "  Primary Color: $THEME_COLOR_PRIMARY"
echo "  Primary Dark:  $THEME_COLOR_PRIMARY_DARK"
echo "  Primary Light: $THEME_COLOR_PRIMARY_LIGHT"

echo "Generating CSS from template..."
sed -e "s|\${THEME_COLOR_PRIMARY}|${THEME_COLOR_PRIMARY}|g" \
    -e "s|\${THEME_COLOR_PRIMARY_DARK}|${THEME_COLOR_PRIMARY_DARK}|g" \
    -e "s|\${THEME_COLOR_PRIMARY_LIGHT}|${THEME_COLOR_PRIMARY_LIGHT}|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "SUCCESS: Theme CSS generated at $OUTPUT_FILE"
    echo "==================================="
else
    echo "ERROR: Failed to generate theme CSS"
    exit 1
fi