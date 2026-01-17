#!/bin/bash

# Simple script to create minimal fixtures for building the website

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Creating minimal fixtures for build..."
mkdir -p "$PROJECT_DIR/build/fixtures"

# Create machine-info.json
cat > "$PROJECT_DIR/build/fixtures/machine-info.json" << 'EOF'
{
  "groups": {},
  "hosts": {},
  "machines": {
    "slurm_compute_nodes": [],
    "slurm_login_nodes": [],
    "bare_metals": []
  }
}
EOF

# Create ssh-info.json
cat > "$PROJECT_DIR/build/fixtures/ssh-info.json" << 'EOF'
{
  "services": [],
  "ssh_keys": []
}
EOF

# Create website-config.json
cat > "$PROJECT_DIR/build/fixtures/website-config.json" << 'EOF'
{
  "discord_invite_code": "example",
  "healthchecksio_read_key": "example",
  "sentry_dsn": "",
  "ga_measurement_id": "",
  "sentry_tunnel": "https://stunnel.watonomous.ca/tunnel",
  "docs_repository_base": "https://github.com/WATonomous/watcloud-website/tree/master/",
  "default_locale": "en-US",
  "base_path": "",
  "repo": "WATonomous/watcloud-website",
  "repo_id": "R_kgDOKpbFkA",
  "category": "Blog",
  "category_id": "DIC_kwDOKpbFkM4CfjLn"
}
EOF

# Create schema files
cat > "$PROJECT_DIR/build/fixtures/affiliation.schema.json" << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {}
}
EOF

cat > "$PROJECT_DIR/build/fixtures/user.schema.generated.json" << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {}
}
EOF

# Create affiliation-info.json
cat > "$PROJECT_DIR/build/fixtures/affiliation-info.json" << 'EOF'
{
  "affiliations": []
}
EOF

# Create user-profiles.json
cat > "$PROJECT_DIR/build/fixtures/user-profiles.json" << 'EOF'
{}
EOF

echo "Generating TypeScript types..."
./node_modules/.bin/quicktype -o "$PROJECT_DIR/build/fixtures/machine-info.ts" "$PROJECT_DIR/build/fixtures/machine-info.json"
./node_modules/.bin/quicktype -o "$PROJECT_DIR/build/fixtures/ssh-info.ts" "$PROJECT_DIR/build/fixtures/ssh-info.json"
./node_modules/.bin/quicktype -o "$PROJECT_DIR/build/fixtures/website-config.ts" "$PROJECT_DIR/build/fixtures/website-config.json"
./node_modules/.bin/quicktype -o "$PROJECT_DIR/build/fixtures/affiliation-info.ts" "$PROJECT_DIR/build/fixtures/affiliation-info.json"
./node_modules/.bin/quicktype -o "$PROJECT_DIR/build/fixtures/user-profiles.ts" "$PROJECT_DIR/build/fixtures/user-profiles.json"

echo "Creating string directories..."
mkdir -p "$PROJECT_DIR/build/fixtures/ssh-info-strings"
mkdir -p "$PROJECT_DIR/build/fixtures/user-schema-strings"

# Create minimal string files
cat > "$PROJECT_DIR/build/fixtures/ssh-info-strings/strings.js" << 'EOF'
export default {};
EOF

cat > "$PROJECT_DIR/build/fixtures/user-schema-strings/strings.js" << 'EOF'
export default {};
EOF

echo "Compiling JSON schema validators..."
node "$PROJECT_DIR/scripts/compile-json-schema-validators.js" "$PROJECT_DIR/build/fixtures" || echo "Schema compilation failed but continuing..."

echo "Creating asset config..."
mkdir -p "$PROJECT_DIR/build/cache"
mkdir -p "$PROJECT_DIR/build/fixtures/images"

# Create minimal images.ts
cat > "$PROJECT_DIR/build/fixtures/images.ts" << 'EOF'
// Minimal images export for build compatibility
const placeholder = {
  avif: { src: "/placeholder.jpg", width: 200, height: 200 },
  webp: { src: "/placeholder.jpg", width: 200, height: 200 },
  jpg: { src: "/placeholder.jpg", width: 200, height: 200 }
};

export const ComputerDark = placeholder;
export const ComputerLight = placeholder;
export const RobotDark = placeholder;
export const RobotLight = placeholder;
export const CloudDark = placeholder;
export const CloudLight = placeholder;

// Create allImages object for compatibility
export const allImages: Record<string, any> = {
  "computer-dark": ComputerDark,
  "computer-light": ComputerLight,
  "robot-dark": RobotDark,
  "robot-light": RobotLight,
  "cloud-dark": CloudDark,
  "cloud-light": CloudLight,
  "server-room-light": placeholder,
  "server-room-dark": placeholder,
  "under-the-hood-wide": placeholder,
  "under-the-hood-square": placeholder,
  "doc-proxmox-primary-gpu": placeholder,
  "doc-kubernetes-cheat-sheet-k9s": placeholder,
  "blog-slurm-ci-graph-light": placeholder,
  "blog-slurm-ci-graph-dark": placeholder,
  "blog-slurm-ci-square": placeholder,
  "blog-slurm-ci-wide": placeholder,
  "blog-slurm-ci-pipeline-light": placeholder,
  "blog-slurm-ci-pipeline-dark": placeholder,
  "blog-vllm-tmux": placeholder,
  "blog-vllm-wide": placeholder,
  "blog-vllm-square": placeholder
};
EOF

echo "Minimal fixtures created successfully!"