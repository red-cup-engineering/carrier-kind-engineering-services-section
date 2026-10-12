from pyfars.operator.edit.fm_set import set_field


def test_set_overwrites():
    fm = {"a": 1}
    out = set_field(fm, "a", 2)
    assert out["a"] == 2
    assert fm["a"] == 1  # original unchanged


def test_set_creates_key_if_absent():
    out = set_field({}, "title", "Alpha")
    assert out == {"title": "Alpha"}
