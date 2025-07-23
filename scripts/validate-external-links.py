"""
Purpose: Tool to detect broken external links on a website before it
reaches production. Whitelisted URLs are ignored. This implementation detects
if broken external links on a website *statefully*. If a link has been UP at 
least once in the last `GRACE_DAYS` days, the outage is ignored and considered
temporary.

Note: treats a link as external if and only if it doesn't direct to a subpage
of the base URL

Usage:
    python3 validate-external-links.py <BASE_URL> <STATE_READ_PATH> <STATE_WRITE_PATH>
"""

from bs4 import BeautifulSoup
from curl_cffi import requests
from urllib.parse import urljoin, urldefrag, urlparse
from datetime import datetime, timedelta, timezone
import json, os, sys, time

GRACE_DAYS = 3 # Ignore link outages if they worked recently
BACKOFF_BASE = 10 # base (seconds) for linear or exponential backoffs

# Broken links that match these exactly will be ignored.
# Since these links are external, these links will not be recursed on
# when searching for links on a page.
WHITELISTED_URLS = [
    "https://www.linkedin.com/in/alex-boden/"
]

# Broken links that have these as a prefix will be ignored.
# These links will also not be recursed on.
WHITELISTED_PREFIXES = [
    "https://github.com/WATonomous/infra-config",
    "https://github.com/WATonomous/infra-notes",
    "https://github.com/WATonomous/watcloud-website",
    # FIXME: ceph.io is down and blocking PRs. This is a temporary workaround
    # Discussion here: https://discord.com/channels/478659303167885314/1331445846121644133
    "https://ceph.io",
    "https://rgw-preview.watonomous.ca/cdn-cgi/l/email-protection", # This is a Cloudflare email protection link
]

# These are the URL schemes that are treated as links (internal and external)
SCHEMES = [
    "",
    "https",
    "http"
]


def clean_url(url):
    parsed = urlparse(url)
    return str(parsed.hostname).lower() + parsed.path.lower()


CLEANED_WHITELISTED_URLS = [clean_url(url) for url in WHITELISTED_URLS]
CLEANED_WHITELISTED_PREFIXES = [clean_url(url) for url in WHITELISTED_PREFIXES]


if len(sys.argv) < 4:
    print(f"Usage: python3 {__file__} <BASE_URL> <STATE_READ_PATH> <STATE_WRITE_PATH>")
    sys.exit(1)

BASE_URL = sys.argv[1]
STATE_READ_PATH = sys.argv[2]
STATE_WRITE_PATH = sys.argv[3]

print(f"INFO: Base URL: {BASE_URL}")
print(f"INFO: State read path: {STATE_READ_PATH}")
print(f"INFO: State write path: {STATE_WRITE_PATH}")

def _now() -> datetime:
    return datetime.now(timezone.utc)

def load_state(path: str) -> dict[str, datetime]:
    try:
        with open(path, "r") as f:
            raw = json.load(f)
        ret = {k: datetime.fromisoformat(v) for k, v in raw.items()}
        print(f"INFO: Loaded {len(ret)} state objects from {path}")
        return ret
    except FileNotFoundError:
        print(f"WARNING: state file {path} not found, starting fresh")
        return {}
    except Exception as e:
        print(f"WARNING: could not load state file {path}: {e}, starting fresh")
        return {}

def save_state(state: dict[str, datetime], path: str) -> None:
    print(f"INFO: Saving {len(state)} state objects to {path}")
    with open(path, "w") as f:
        json.dump({k: v.isoformat() for k, v in state.items()}, f, indent=2)

class ExternalLink:
    def __init__(self, is_broken: bool, page: str,
                 dest: str, code: int, err_str: str):
        self.is_broken = is_broken  # Whether the link is broken or not
        self.page = page            # The internal page that the link is located in
        self.dest = dest            # The external site the link directs to
        self.code = code            # The status code returned from the external site
        self.err_str = err_str      # The meaning of the status code


def recursively_fetch_internal_pages(visited, url) -> None:
    if is_external_url(url):
        return

    if url in visited:
        return

    visited.add(url)
    links = get_links_on_page(url)
    for link in links:
        # Recurse on links ignoring fragments for efficiency
        defragged_link, _ = urldefrag(link)
        recursively_fetch_internal_pages(visited, defragged_link)


def is_external_url(url):
    return not url.startswith(BASE_URL.rstrip("/"))


def is_number(value):
    if value is None:
        return False
    try:
        float(value)
        return True
    except ValueError:
        return False


def check_link(url: str, page: str, attempt: int = 1) -> ExternalLink:
    print(f"Checking link {url} on page {page} (attempt {attempt})")
    try:
        request_response = requests.get(url, allow_redirects=True,
                                        impersonate="safari", timeout=BACKOFF_BASE*attempt)

        # Get the HTTP status code
        request_code = request_response.status_code

        if request_code == 200:
            return ExternalLink(False, page, url, request_code, "")

        # Consider these status codes as broken
        if request_code == 401:
            err_str = "Unauthorized"
        elif request_code == 403:
            err_str = "Forbidden"
        elif request_code == 404:
            err_str = "Page not found"
        elif request_code == 429:
            err_str = "Too many requests"
            retry_after = request_response.headers.get("Retry-After")
            backoff_seconds = BACKOFF_BASE * attempt
            retry_duration = int(retry_after) if is_number(retry_after) else backoff_seconds
            print(f"\tRate limit hit, retrying in {retry_duration} seconds...")
            time.sleep(retry_duration)
        elif request_code >= 400 and request_code < 500:
            err_str = "Client error"
        elif request_code >= 500:
            err_str = "Server error (possibly because of authentication)"
        elif request_response.history and \
            (request_response.history[-1].status_code == 302 or
                request_response.history[-1].status_code == 307):
            # Redirect likely due to no authorization
            request_code = request_response.history[-1].status_code
            err_str = "Unauthorized redirect (likely)"
        else:
            err_str = "Unspecified error"

        if attempt < 3:
            print(f"WARNING: Failed to fetch {url} (attempt {attempt} of 3)")
            return check_link(url, page, attempt + 1)
        return ExternalLink(True, page, url, request_code, err_str)

    except requests.exceptions.Timeout:
        if attempt < 3:
            return check_link(url, page, attempt + 1)
        return ExternalLink(True, page, url, -1, "Timeout")
    except requests.exceptions.RequestException as e:
        # Any error like connection issues are treated as broken links
        if attempt < 3:
            return check_link(url, page, attempt + 1)
        return ExternalLink(True, page, url, -1, f'Request exception: {str(e)}')


def get_links_on_page(url):
    try:
        response = requests.get(url)

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract all anchor tags with href attributes
        all_links = [a.get('href') for a in soup.find_all('a', href=True)]
        filtered_links = [url for url in all_links if urlparse(url).scheme in SCHEMES]

        # Join relative URLs with the base URL to form complete links
        return [urljoin(url, link) for link in filtered_links]
    except:
        return []


def is_whitelisted(url):
    url = clean_url(url)

    if url in CLEANED_WHITELISTED_URLS:
        return True

    for wl_prefix in CLEANED_WHITELISTED_PREFIXES:
        if url.startswith(wl_prefix):
            return True

    return False


if __name__ == "__main__":
    state = load_state(STATE_READ_PATH)
    cutoff = _now() - timedelta(days=GRACE_DAYS)

    internal_urls = set()
    print("Recursively fetching internal pages...")
    recursively_fetch_internal_pages(internal_urls, BASE_URL)
    print(f"Fetched {len(internal_urls)} internal pages")

    print("Checking external links...")
    whitelist_ignores_count = 0
    external_links = []

    for internal_url in internal_urls:
        for link in get_links_on_page(internal_url):
            if is_whitelisted(link):
                whitelist_ignores_count += 1
                print(f"INFO: Ignoring whitelisted link {link}")
                continue
            if is_external_url(link):
                external_links.append(check_link(link, internal_url))
            
    broken_count = 0
    for external_link in external_links:

        if not external_link.is_broken:
            state[external_link.dest] = _now()
            continue
        
        last_ok = state.get(external_link.dest)
        if last_ok and last_ok > cutoff:
            print(f"WARNING: ignoring outage for {external_link.dest} (last OK {last_ok.isoformat()}) which is in the last {GRACE_DAYS} days")
            continue

        broken_count += 1
        print(f"ERROR: Broken link to {external_link.dest} found last reporting status code {external_link.code} on {external_link.page}")

    # Prune stale entries from the state
    prune_cutoff = _now() - timedelta(days=GRACE_DAYS)
    state = {k: v for k, v in state.items() if v > prune_cutoff}

    print(f"INFO: Saving state to {STATE_WRITE_PATH}")
    save_state(state, STATE_WRITE_PATH)

    print("DONE")
    print(f"{len(external_links)} external links in total")
    print(f"{whitelist_ignores_count} broken whitelisted links ignored")
    print(f"{broken_count} broken links")

    if broken_count:
        sys.exit(1)

    sys.exit(0)
