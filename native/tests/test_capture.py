import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klipring.htmltext import html_to_text


class CaptureTests(unittest.TestCase):
    def test_html_to_text(self):
        raw = "<html><body><p>Hello&nbsp;<b>world</b></p></body></html>"
        self.assertEqual(html_to_text(raw), "Hello world")


if __name__ == "__main__":
    unittest.main()
