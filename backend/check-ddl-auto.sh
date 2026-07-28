#!/usr/bin/env bash
# CampusServ DDL-Auto Guard Script (Bash)
# Enforces that hibernate.ddl-auto is strictly set to 'validate' or 'none' across all microservices.

set -e

FAILED=0
FILES=$(find . -name "application*.yml" -o -name "application*.yaml")

for file in $FILES; do
    while IFS= read -r line; do
        if [[ "$line" =~ ddl-auto:[[:space:]]*([a-zA-Z0-9_-]+) ]]; then
            val=$(echo "${BASH_REMATCH[1]}" | tr '[:upper:]' '[:lower:]')
            if [[ "$val" != "validate" && "$val" != "none" ]]; then
                echo "[ERROR] Invalid ddl-auto setting '$val' found in $file. Must be 'validate' or 'none'."
                FAILED=1
            fi
        fi
    done < "$file"
done

if [ "$FAILED" -eq 1 ]; then
    echo "[FAIL] One or more microservices violate the ddl-auto resilience rule."
    exit 1
else
    echo "[SUCCESS] All microservices comply with ddl-auto: validate/none rules."
    exit 0
fi
