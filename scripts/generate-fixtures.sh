#!/bin/bash

# This script is used to generate fixtures (data) for the website.
# There are 2 ways to generate fixtures:
# 1. generate using the `data` branch (requires an internal monorepo).
# 2. download fixtures from production.
# If the `FETCH_FIXTURES_FROM` environment variable or the --fetch-from
# arg is specified, then fixtures will be downloaded instead of generated
# from the `data` branch.

set -o errexit -o nounset -o pipefail

usage() {
	echo "Usage: $0 [--fetch-from https://...]"
}

to_pascale_case() {
    echo "$1" | sed -E 's/(^|_|-)([a-z])/\U\2/g'
}

# Parse command line arguments
# Derived from https://stackoverflow.com/a/14203146/4527337
__fetch_from=${FETCH_FIXTURES_FROM:-}
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --fetch-from)
      __fetch_from="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done
if [ ${#POSITIONAL_ARGS[@]} -ne 0 ]; then
    set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Preparing workspace..."
# Clean up any previous fixtures
git worktree remove "$PROJECT_DIR/build/data" 2>/dev/null || true
rm -rf "$PROJECT_DIR/build/data"
rm -rf "$PROJECT_DIR/build/fixtures"

# Create the fixture directory
mkdir -p "$PROJECT_DIR/build/fixtures"

if [ -n "$__fetch_from" ]; then
    echo "Fetching fixtures from $__fetch_from..."
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/machine-info.json" "$__fetch_from/machine-info.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/ssh-info.json" "$__fetch_from/ssh-info.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/website-config.json" "$__fetch_from/website-config.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/affiliation.schema.json" "$__fetch_from/affiliation.schema.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/user.schema.generated.json" "$__fetch_from/user.schema.generated.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/affiliation-info.json" "$__fetch_from/affiliation-info.json"
    wget --no-verbose -O "$PROJECT_DIR/build/fixtures/user-profiles.json" "$__fetch_from/user-profiles.json"
else
    echo "Generating fixtures..."

    # In shallow clones (e.g. `gh repo clone -- --depth 1`), or when cloning
    # the public mirror — which does not contain the `data` branch — the
    # `origin/data` ref may be missing locally. Try to fetch it on demand,
    # and fall back to an actionable error if it is unavailable.
    if ! git rev-parse --verify --quiet refs/remotes/origin/data >/dev/null; then
        echo "origin/data not found locally; fetching..."
        if ! git fetch --depth=1 origin data:refs/remotes/origin/data; then
            cat >&2 <<EOF

ERROR: Unable to find the 'data' branch on origin.

The 'data' branch lives in the internal monorepo and is not mirrored to the
public repo. To generate fixtures from a public source instead, re-run with
FETCH_FIXTURES_FROM set (or pass --fetch-from). For example:

    FETCH_FIXTURES_FROM=https://cloud.watonomous.ca/fixtures npm run generate-fixtures

See README.md for details.
EOF
            exit 1
        fi
    fi

    # Create a new worktree
    git worktree add "$PROJECT_DIR/build/data" origin/data
    # Generate fixtures
    python3 "$SCRIPT_DIR/generate-machine-info.py" "$PROJECT_DIR/build/data" "$PROJECT_DIR/build/fixtures"
    python3 "$SCRIPT_DIR/generate-ssh-info.py" "$PROJECT_DIR/build/fixtures"
    python3 "$SCRIPT_DIR/generate-website-config.py" "$PROJECT_DIR/../outputs" "$PROJECT_DIR/build/fixtures"
    cp "$PROJECT_DIR/../directory/affiliations/affiliation.schema.json" "$PROJECT_DIR/build/fixtures"
    cp "$PROJECT_DIR/../outputs/directory/users/user.schema.generated.json" "$PROJECT_DIR/build/fixtures"
    python3 "$SCRIPT_DIR/generate-affiliation-info.py" "$PROJECT_DIR/build/fixtures"
    python3 "$SCRIPT_DIR/generate-user-profiles.py" > "$PROJECT_DIR/build/fixtures/user-profiles.json"
fi

# Add typescript types
echo "Generating fixture types..."
./node_modules/.bin/quicktype -o "$PROJECT_DIR"/build/fixtures/machine-info.{ts,json}
./node_modules/.bin/quicktype -o "$PROJECT_DIR"/build/fixtures/ssh-info.{ts,json}
./node_modules/.bin/quicktype -o "$PROJECT_DIR"/build/fixtures/website-config.{ts,json}
./node_modules/.bin/quicktype -o "$PROJECT_DIR"/build/fixtures/affiliation-info.{ts,json}
./node_modules/.bin/quicktype -o "$PROJECT_DIR"/build/fixtures/user-profiles.{ts,json}

echo "Generating mdx files from data..."
python3 "$SCRIPT_DIR/generate-mdx-strings.py" json-to-mdx "$PROJECT_DIR/build/fixtures/ssh-info.json" "$PROJECT_DIR/build/fixtures/ssh-info-strings"
python3 "$SCRIPT_DIR/generate-mdx-strings.py" json-to-mdx "$PROJECT_DIR/build/fixtures/user.schema.generated.json" "$PROJECT_DIR/build/fixtures/user-schema-strings"

echo "Compiling JSON schema validators..."
node "$PROJECT_DIR/scripts/compile-json-schema-validators.js" "$PROJECT_DIR/build/fixtures"

echo "Generating assets..."
node "$PROJECT_DIR/scripts/generate-assets.js" "$PROJECT_DIR/build/fixtures/user-profiles.json" "$PROJECT_DIR/build/fixtures" "$PROJECT_DIR/build/cache"
