import argparse
import json
import os
import re
import yaml
from pathlib import Path

def generate_fixtures(outputs_path):
    with open(Path(outputs_path, "discord/outputs.yaml"), 'r') as file:
        discord_outputs = yaml.safe_load(file)

    with open(Path(outputs_path, "sentry/outputs.yaml"), 'r') as file:
        sentry_outputs = yaml.safe_load(file)

    return {
        "discord_invite_code": discord_outputs["watcloud_website_invite_code"],
        # Obtained from https://healthchecks.io/projects/7acc2ad3-f672-40c9-a061-12c8fd128f8b/settings/
        "healthchecksio_read_key": "hcr_RNvMq5zwrGcvXurloN5mF9ino3qs",
        "sentry_dsn": sentry_outputs["watcloud-website-dsn"],
        # Obtained from https://analytics.google.com/analytics/web/#/p405574179/reports/intelligenthome
        "ga_measurement_id": "G-F19HMC41TD",
        # Deployed in the Kubernetes cluster
        "sentry_tunnel": "https://stunnel.watonomous.ca/tunnel",
        "docs_repository_base": "https://github.com/WATonomous/watcloud-website/tree/master/",
        "default_locale": "en-US",
        "base_path": re.sub(r"/$", "", os.getenv("WEBSITE_BASE_PATH", "")),
        # Giscus setup obtained from https://giscus.app/. Note: entering repo name may refresh the id strings
        # The 'Blog' Discussion category was manually created on WATonomous/watcloud-website repo to store comments
        "repo": "WATonomous/watcloud-website",
        "repo_id": "R_kgDOKpbFkA",
        "category": "Blog",
        "category_id": "DIC_kwDOKpbFkM4CfjLn"
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate website config')
    parser.add_argument('outputs_path', type=str, help='Path to outputs')
    parser.add_argument('fixtures_path', type=str, help='Path to fixtures')
    args = parser.parse_args()
    fixtures = generate_fixtures(args.outputs_path)
    with open(Path(args.fixtures_path, "website-config.json"), 'w') as file:
        json.dump(fixtures, file, indent=2)
