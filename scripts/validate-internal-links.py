"""
Purpose: Tool to detect broken internal links on a website before it reaches production.

Use: python3 validate-internal-links.py <BASE_URL> 
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

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
    visited = set()
    internal_links_tuples = set() # (source, destination, xpath)
    external_links = set()
    def crawl(url):
        """Recursively fetch links from the given URL, separating internal and external links."""
        try:
            response = session.get(url, timeout=DEFAULT_TIMEOUT)
        except requests.RequestException as e:
            print(f"Request for {url} failed: {e}")
            global fail_build 
            fail_build = True
            return

        soup = BeautifulSoup(response.text, 'html.parser')
        for a in soup.find_all('a', href=True):
            link = urljoin(url, a.get('href'))
            if link not in visited:
                visited.add(link)
                xpath = get_xpath(a)
                if is_internal_url(link):
                    link = convert_deployed_domain_to_base(link)
                    internal_links_tuples.add((url, link, xpath))
                    # print(f"Found internal link: {link} from url: {url} at xpath path: {xpath}")
                    link_without_fragment = urlparse(link)._replace(fragment='').geturl()
                    crawl(link_without_fragment)
                else:
                    external_links.add(link)
        return internal_links_tuples, external_links
    return crawl(url)

def get_response_code(full_url) -> int:
    """Check if a URL, including its fragment, is valid. 
    Returns: The request status code if the link isn't valid
    """
    # Parse the URL to separate it from the fragment
    parsed_url = urlparse(full_url)
    url = parsed_url._replace(fragment='').geturl()

    try:
        response = session.get(url, timeout=DEFAULT_TIMEOUT)
        return response.status_code  
    except requests.RequestException as e:
        print(f"Request for {url} failed: {e}")
        return -1  

def check_fragment_validity(full_url) -> bool:
    """Check if a fragment in a URL is valid."""
    parsed_url = urlparse(full_url)
    fragment = parsed_url.fragment 
    try:
        response = session.get(parsed_url._replace(fragment='').geturl(), timeout=DEFAULT_TIMEOUT)
    except requests.RequestException:
        return False

    # If there's a fragment, check if it corresponds to an id in the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    if soup.find(id=fragment) or soup.find_all(attrs={"name": fragment}):
        return True # Fragment is valid

    # Fragment not found
    return False 

def link_has_fragment(full_url) -> bool:
    return urlparse(full_url).fragment != ''

def validate_internal_links(internal_links_tuples):
    """Check if internal links are valid in parallel."""
    invalid_links = []

    def check_link(link):
        """Check if the link is valid."""
        _, destination, _ = link
        status_code = get_response_code(destination)
        return (link, status_code) if status_code != 200 else None

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(check_link, link) for link in internal_links_tuples]
        for future in as_completed(futures):
            result = future.result()
            if result:
                invalid_links.append(result)

    return invalid_links

def validate_internal_link_fragments(internal_links_tuples):
    """Check if internal link fragments are valid in parallel."""
    invalid_fragment_links = []

    def check_fragment(link):
        """Check if the fragment of the link is valid."""
        _, destination, _ = link
        if link_has_fragment(destination):
            if not check_fragment_validity(destination):
                return link
        return None

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(check_fragment, link) for link in internal_links_tuples]
        for future in as_completed(futures):
            result = future.result()
            if result:
                invalid_fragment_links.append(result)

    return invalid_fragment_links

if __name__ == '__main__':
    print("Collecting links...")
    internal_links_tuples, external_links = crawl_and_fetch_links(BASE_URL)
    print(f"Found {len(internal_links_tuples)} internal links")
    print(f"Found {len(external_links)} external links")

    # Run the validation in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        validate_internal_links_future = executor.submit(validate_internal_links, internal_links_tuples)
        validate_internal_fragments_future = executor.submit(validate_internal_link_fragments, internal_links_tuples)

        # Wait for both validations to complete
        invalid_internal_links = validate_internal_links_future.result()
        invalid_fragment_links = validate_internal_fragments_future.result()

    # Print the results
    if len(invalid_internal_links) == 0 and len(invalid_fragment_links) == 0 and not fail_build:
        print(f"All {len(internal_links_tuples)} internal links are valid.")
        sys.exit(0) # Exit with success

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
