"""Run with: python3 -m unittest discover -s website/scripts -p 'test_*.py' -v"""

import importlib.util
import io
import runpy
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import call, patch


class CrawlTests(unittest.TestCase):
    def setUp(self):
        base_url = "http://localhost/"
        script = Path(__file__).with_name("validate-internal-links.py")
        spec = importlib.util.spec_from_file_location("link_checker", script)
        checker = importlib.util.module_from_spec(spec)
        with patch("sys.argv", [str(script), base_url]):
            spec.loader.exec_module(checker)
        self.addCleanup(checker.session.close)
        self.checker = checker
        self.base_url = base_url
        self.script = script

    def test_fetches_each_page_once_and_keeps_fragment_links(self):
        checker = self.checker
        base_url = self.base_url

        # Arrange: two links to the same page, and a link back to the homepage.
        pages = {
            base_url: '<a href="/guide.html#install">Install</a>'
                      '<a href="/guide.html#usage">Usage</a>',
            base_url + "guide.html": '<h2 id="install">Install</h2>'
                                     '<h2 id="usage">Usage</h2>'
                                     '<a href="/">Home</a>',
        }

        def fake_get(url, **kwargs):
            return SimpleNamespace(text=pages[url], status_code=200)

        # Act: replace HTTP requests, but run the real crawler and HTML parser.
        with patch.object(checker.session, "get", side_effect=fake_get) as get:
            internal_links, external_links, page_info = checker.crawl_and_fetch_links(base_url)

        # Assert: each page was fetched exactly once (regardless of order).
        self.assertEqual(get.call_count, 2)
        get.assert_has_calls([
            call(base_url, timeout=checker.DEFAULT_TIMEOUT),
            call(base_url + "guide.html", timeout=checker.DEFAULT_TIMEOUT),
        ], any_order=True)

        # Both fragment links and the return link must survive page deduplication.
        self.assertEqual(
            {(source, destination) for source, destination, xpath in internal_links},
            {
                (base_url, base_url + "guide.html#install"),
                (base_url, base_url + "guide.html#usage"),
                (base_url + "guide.html", base_url),
            },
        )
        self.assertEqual(external_links, set())

        # For each page, the crawler must record the status code and the set of fragment IDs.
        self.assertEqual(
            page_info,
            {
                base_url: {"status_code": 200, "fragments": set()},
                base_url + "guide.html": {"status_code": 200, "fragments": {"install", "usage"}},
            }
        )

        # Assert: the get_response_code function must return the correct status code for each page.
        self.assertEqual(
            checker.get_response_code(base_url + "guide.html#install", page_info),
            200,
        )
        self.assertEqual(
            checker.get_response_code(base_url + "missing.html", page_info),
            -1,
        )

        # page and fragment exist
        self.assertTrue(
            checker.check_fragment_validity(
                base_url + "guide.html#install", page_info
            )
        )

        # page exists but fragment does not
        self.assertFalse(
            checker.check_fragment_validity(
                base_url + "guide.html#missing", page_info
            )
        )

        # page does not exist, so fragment cannot be valid
        self.assertFalse(
            checker.check_fragment_validity(
                base_url + "missing.html#install", page_info
            )
        )

        # Assert: the validate_internal_links and validate_internal_link_fragments functions must not send any HTTP requests.
        with patch.object(
            checker.session,
            "get",
            side_effect=AssertionError("Validation must not send HTTP requests"),
        ):
            self.assertEqual(
                checker.validate_internal_links(internal_links, page_info),
                [],
            )
            self.assertEqual(
                checker.validate_internal_link_fragments(internal_links, page_info),
                [],
            )

    def crawl_pages(self, pages):
        """Run the real crawler against URL -> HTML/status/exception fixtures."""
        def fake_get(url, **kwargs):
            value = pages[url]  # Unexpected requests fail immediately.
            if isinstance(value, Exception):
                raise value
            status, html = value if isinstance(value, tuple) else (200, value)
            return SimpleNamespace(status_code=status, text=html)

        with patch.object(self.checker.session, "get", side_effect=fake_get) as get:
            with redirect_stdout(io.StringIO()):
                result = self.checker.crawl_and_fetch_links(self.base_url)
        return (*result, get)

    def validate_without_requests(self, links, page_info):
        with patch.object(
            self.checker.session, "get",
            side_effect=AssertionError("Validation must not send HTTP requests"),
        ):
            return (
                self.checker.validate_internal_links(links, page_info),
                self.checker.validate_internal_link_fragments(links, page_info),
            )

    def test_reports_404_with_each_source_and_xpath(self):
        base = self.base_url
        links, _, info, get = self.crawl_pages({
            base: '<a href="missing">First</a><a href="other">Other</a>'
                  '<a href="missing">Second</a>',
            base + "other": '<a href="missing">Third</a>',
            base + "missing": (404, "Not found"),
        })
        invalid, fragments = self.validate_without_requests(links, info)
        self.assertCountEqual(invalid, [
            ((base, base + "missing", "/a[1]"), 404),
            ((base, base + "missing", "/a[3]"), 404),
            ((base + "other", base + "missing", "/a[1]"), 404),
        ])
        self.assertEqual(fragments, [])
        self.assertEqual(get.call_count, 3)

    def test_accepts_id_and_name_but_reports_missing_fragment(self):
        base = self.base_url
        links, _, info, get = self.crawl_pages({
            base: '<a href="guide#current">Current</a>'
                  '<a href="guide#legacy">Legacy</a>'
                  '<a href="guide#missing">Missing</a>'
                  '<a href="guide">No fragment</a>'
                  '<a href="guide#">Empty fragment</a>',
            base + "guide": '<h2 id="current">Current</h2><a name="legacy"></a>',
        })
        invalid, fragments = self.validate_without_requests(links, info)
        self.assertEqual(invalid, [])
        self.assertEqual(fragments, [(base, base + "guide#missing", "/a[3]")])
        self.assertEqual(get.call_count, 2)

    def test_handles_forward_fragment_reference_and_self_link(self):
        base = self.base_url
        links, _, info, get = self.crawl_pages({
            base: '<a href="#later">Jump</a><h2 id="later">Later</h2>',
        })
        self.assertEqual(self.validate_without_requests(links, info), ([], []))
        self.assertEqual(get.call_count, 1)

    def test_maps_deployed_links_to_preview_and_ignores_external_links(self):
        self.base_url = "http://localhost/pr-3332/website/"
        self.checker.BASE_URL = self.base_url
        base = self.base_url
        links, external, info, get = self.crawl_pages({
            base: '<a href="guide#one">Relative</a>'
                  '<a href="https://cloud.watonomous.ca/guide#two">Deployed</a>'
                  '<a href="https://example.org/">External</a>',
            base + "guide": '<h2 id="one">One</h2><h2 id="two">Two</h2>',
        })
        self.assertEqual(self.validate_without_requests(links, info), ([], []))
        self.assertEqual(external, {"https://example.org/"})
        self.assertEqual(get.call_count, 2)
        self.assertCountEqual(info, [base, base + "guide"])

    def test_ignores_cloudflare_email_protection_links(self):
        base = self.base_url
        links, external, info, get = self.crawl_pages({
            base: '<a href="guide">Guide</a>'
                  '<a href="/cdn-cgi/l/email-protection#abc">Obfuscated</a>'
                  '<a href="https://cloud.watonomous.ca/cdn-cgi/l/email-protection">Obfuscated</a>',
            base + "guide": "<h2>Guide</h2>",
        })
        self.assertEqual(self.validate_without_requests(links, info), ([], []))
        self.assertFalse(self.checker.fail_build)
        self.assertEqual(external, set())
        self.assertEqual(
            {(source, destination) for source, destination, xpath in links},
            {(base, base + "guide")},
        )
        self.assertEqual(get.call_count, 2)

    def test_request_failure_is_reported_without_refetching(self):
        base = self.base_url
        links, _, info, get = self.crawl_pages({
            base: '<a href="offline#one">One</a><a href="offline#two">Two</a>',
            base + "offline": self.checker.requests.Timeout("Timed out"),
        })
        invalid, fragments = self.validate_without_requests(links, info)
        self.assertTrue(self.checker.fail_build)
        self.assertCountEqual(invalid, [(link, -1) for link in links])
        self.assertCountEqual(fragments, links)
        self.assertEqual(get.call_count, 2)

    def test_entrypoint_request_failure_returns_empty_results_and_failure_flag(self):
        links, external, info, get = self.crawl_pages({
            self.base_url: self.checker.requests.ConnectionError("Unreachable"),
        })
        self.assertEqual((links, external, info), (set(), set(), {}))
        self.assertTrue(self.checker.fail_build)
        self.assertEqual(get.call_count, 1)

    def test_cli_exit_codes_and_diagnostics(self):
        # Exercise the actual __main__ block; only the network is replaced.
        base = self.base_url
        scenarios = [
            ("valid empty page", {base: (200, "Welcome")}, 0, "All 0 internal links are valid."),
            ("missing fragment", {
                base: (200, '<a href="guide#missing">Guide</a>'),
                base + "guide": (200, '<h2 id="present">Present</h2>'),
            }, 1, "Fragment #missing not found"),
            ("linked 404", {
                base: (200, '<a href="missing">Missing</a>'),
                base + "missing": (404, "Not found"),
            }, 1, "Status code: 404"),
            ("entrypoint timeout", {
                base: self.checker.requests.Timeout("Timed out"),
            }, 1, "Request for " + base + " failed"),
            ("entrypoint 404", {base: (404, "Not found")}, 1, "404"),
        ]
        for name, pages, expected_code, expected_message in scenarios:
            with self.subTest(name=name):
                def fake_get(url, **kwargs):
                    value = pages[url]
                    if isinstance(value, Exception):
                        raise value
                    status, html = value
                    return SimpleNamespace(status_code=status, text=html)

                output = io.StringIO()
                with patch("sys.argv", [str(self.script), base]), \
                     patch("requests.Session.get", side_effect=fake_get) as get, \
                     redirect_stdout(output), \
                     self.assertRaises(SystemExit) as exited:
                    runpy.run_path(str(self.script), run_name="__main__")
                self.assertEqual(exited.exception.code, expected_code)
                self.assertIn(expected_message, output.getvalue())
                self.assertEqual(get.call_count, len(pages))

    def test_cli_omits_empty_link_report_when_only_a_page_fails(self):
        base = self.base_url
        output = io.StringIO()
        with patch("sys.argv", [str(self.script), base]), \
             patch("requests.Session.get", return_value=SimpleNamespace(status_code=404, text="Not found")), \
             redirect_stdout(output), \
             self.assertRaises(SystemExit) as exited:
            runpy.run_path(str(self.script), run_name="__main__")
        self.assertEqual(exited.exception.code, 1)
        self.assertIn("returned status code: 404", output.getvalue())
        self.assertNotIn("ERROR with the following internal links:", output.getvalue())

if __name__ == "__main__":
    unittest.main()

