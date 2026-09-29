#!/bin/bash

# This script is used to run commands post-build.

set -o errexit -o nounset -o pipefail

echo "Running post-build commands..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy generated fixtures to the output directory
cp -r "$PROJECT_DIR/build/fixtures" "$PROJECT_DIR/out/."
# Build the search index. Nextra 4 uses Pagefind, which indexes the generated HTML:
# https://nextra.site/docs/guide/search
"$PROJECT_DIR/node_modules/.bin/pagefind" --site "$PROJECT_DIR/.next/server/app" --output-path "$PROJECT_DIR/out/_pagefind"
