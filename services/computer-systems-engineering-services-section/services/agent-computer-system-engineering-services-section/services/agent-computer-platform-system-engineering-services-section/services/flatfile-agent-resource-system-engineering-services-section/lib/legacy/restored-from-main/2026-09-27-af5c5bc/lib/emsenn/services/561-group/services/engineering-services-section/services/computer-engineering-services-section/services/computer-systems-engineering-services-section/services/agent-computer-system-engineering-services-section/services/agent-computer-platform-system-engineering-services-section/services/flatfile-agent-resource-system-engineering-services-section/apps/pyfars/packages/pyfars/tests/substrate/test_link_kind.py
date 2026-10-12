"""Link-kind classification — guard against regressions to the
``trailing-slash dir link is an asset`` bug that hid broken section links.
"""

from pyfars.substrate.parse.link_kind import classify


def test_external_url():
    assert classify("https://example.com") == "external"
    assert classify("http://example.com") == "external"
    assert classify("mailto:x@y.z") == "external"


def test_anchor():
    assert classify("#section") == "anchor"


def test_md_relative():
    assert classify("foo.md") == "relative"
    assert classify("../bar/foo.md") == "relative"


def test_md_absolute():
    assert classify("/foo.md") == "absolute"


def test_directory_link_is_relative_not_asset():
    assert classify("skills/") == "relative"
    assert classify("../foo/") == "relative"


def test_directory_link_absolute():
    assert classify("/skills/") == "absolute"


def test_image_is_asset():
    assert classify("img.png") == "asset"
    assert classify("../assets/x.svg") == "asset"
