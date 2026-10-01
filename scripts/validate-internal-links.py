"""
Purpose: Tool to detect broken internal links on a website before it reaches production.

Use: python3 validate-internal-links.py <BASE_URL> 
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import sys

from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

# CONFIG
if len(sys.argv) < 2:
    print("Usage: python3 check_links.py <BASE_URL>")
    sys.exit(1)

BASE_URL = sys.argv[1] 
DEPLOYED_DOMAIN = "https://cloud.watonomous.ca/"  # Where the build is deployed

fail_build = False

# HTTP client configuration
DEFAULT_TIMEOUT = 30
retry_strategy = Retry(
    total=3,
    backoff_factor=15,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=frozenset(["HEAD", "GET", "OPTIONS"])
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session = requests.Session()
session.mount("http://", adapter)
session.mount("https://", adapter)

def is_internal_url(url):
    """Check if a URL is internal to the website."""
    return url.startswith(BASE_URL) or url.startswith(DEPLOYED_DOMAIN)

def is_cloudflare_email_protection_url(url):
    """Cloudflare rewrites email addresses to /cdn-cgi/l/email-protection. Ignoring these"""
    return urlparse(url).path.startswith("/cdn-cgi/l/email-protection")

def convert_deployed_domain_to_base(url):
    """Convert a URL from the deployed domain to the base URL."""
    if url.startswith(DEPLOYED_DOMAIN):
        return url.replace(DEPLOYED_DOMAIN, BASE_URL)
    else:
        return url

def get_xpath(element):
    """
    Generate the XPath for a BeautifulSoup element by iterating through its parents.
    """
    parts = []
    child = element if element.name else element.parent
    for parent in child.parents:
        if parent.name is None:
            break  # Document root reached
        siblings = parent.find_all(child.name, recursive=False)
        # Find the index of the child in its siblings array. XPath is 1-based.
        index = siblings.index(child) + 1
        parts.append(f"{child.name}[{index}]")
        child = parent
    parts.reverse()
    return '/' + '/'.join(parts)

def crawl_and_fetch_links(url):
    """Wrapper function for crawl_and_fetch_links."""
    visited_pages = set()
    page_info = {}
    internal_links_tuples = set() # (source, destination, xpath)
    external_links = set()
    def crawl(url):
        """Recursively fetch links from the given URL, separating internal and external links."""
        global fail_build
        url = convert_deployed_domain_to_base(url)
        url = urlparse(url)._replace(fragment='').geturl()
        if url in visited_pages:
            return
        # Mark before fetching so links back to this page cannot recurse forever.
        visited_pages.add(url)

        try:
            response = session.get(url, timeout=DEFAULT_TIMEOUT)
        except requests.RequestException as e:
            print(f"Request for {url} failed: {e}")
            fail_build = True
            return

        if response.status_code != 200:
            print(f"Request for {url} returned status code: {response.status_code}")
            fail_build = True

        soup = BeautifulSoup(response.text, 'html.parser')
        fragments = set()
        for element in soup.find_all(id=True):
            fragments.add(element['id'])

        for element in soup.find_all(attrs={"name": True}):
            fragments.add(element['name'])

        page_info[url] = {
            "status_code": response.status_code,
            "fragments": fragments
        }
        for a in soup.find_all('a', href=True):
            link = urljoin(url, a.get('href'))
            if is_cloudflare_email_protection_url(link):
                continue
            if is_internal_url(link):
                link = convert_deployed_domain_to_base(link)
                xpath = get_xpath(a)
                internal_links_tuples.add((url, link, xpath))
                crawl(link)
            else:
                external_links.add(link)

    crawl(url)
    return internal_links_tuples, external_links, page_info

def get_response_code(full_url, page_info) -> int:
    """Read a page's status code from crawler results"""
    # Parse the URL to separate it from the fragment
    parsed_url = urlparse(full_url)
    url = parsed_url._replace(fragment='').geturl()

    info = page_info.get(url)
    if info is None:
        return -1
    return info["status_code"]

def check_fragment_validity(full_url, page_info) -> bool:
    """Check if a fragment in a URL is valid."""
    parsed_url = urlparse(full_url)
    fragment = parsed_url.fragment

    info = page_info.get(parsed_url._replace(fragment='').geturl())
    if info is None:
        return False
    return fragment in info["fragments"]

def link_has_fragment(full_url) -> bool:
    return urlparse(full_url).fragment != ''

def validate_internal_links(internal_links_tuples, page_info):
    """Check if internal links point to pages that returned 200."""
    invalid_links = []
    for link in internal_links_tuples:
        _, destination, _ = link
        status_code = get_response_code(destination, page_info)
        if status_code != 200:
            invalid_links.append((link, status_code))
    return invalid_links

def validate_internal_link_fragments(internal_links_tuples, page_info):
    """Check if internal link fragments exist on their destination pages."""
    invalid_fragment_links = []
    for link in internal_links_tuples:
        _, destination, _ = link
        if link_has_fragment(destination) and not check_fragment_validity(destination, page_info):
            invalid_fragment_links.append(link)
    return invalid_fragment_links

if __name__ == '__main__':
    print("Collecting links...")
    internal_links_tuples, external_links, page_info = crawl_and_fetch_links(BASE_URL)
    print(f"Found {len(internal_links_tuples)} internal links")
    print(f"Found {len(external_links)} external links")

    invalid_internal_links = validate_internal_links(internal_links_tuples, page_info)
    invalid_fragment_links = validate_internal_link_fragments(internal_links_tuples, page_info)

    # Print the results
    if len(invalid_internal_links) == 0 and len(invalid_fragment_links) == 0 and not fail_build:
        print(f"All {len(internal_links_tuples)} internal links are valid.")
        sys.exit(0) # Exit with success

    if invalid_internal_links or invalid_fragment_links:
        print("ERROR with the following internal links:")
        for item in invalid_internal_links:
            link = item[0]
            status_code = item[1]
            print(f"On page: {link[0]} \nto: {link[1]} \nwith XPath: {link[2]}")
            print(f"Status code: {status_code} \n")

        for link in invalid_fragment_links:
            print(f"On page: {link[0]} \nto: {link[1]} \nwith XPath: {link[2]}")
            print(f"Fragment #{urlparse(link[1]).fragment} not found in the HTML. \n")

        print('Hint: Use $x("XPath") in the browser console to find the element.')

    sys.exit(1) # Fail the build if there are invalid links
