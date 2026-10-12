from pyfars.operator.edit.fm_rm import remove


def test_rm_drops_key():
    out = remove({"a": 1, "b": 2}, "a")
    assert out == {"b": 2}


def test_rm_no_op_for_absent_key():
    out = remove({"a": 1}, "b")
    assert out == {"a": 1}


def test_rm_item_drops_one_from_list():
    out = remove({"deps": ["x", "y"]}, "deps", item="x")
    assert out == {"deps": ["y"]}


def test_rm_item_drops_key_when_list_empty():
    out = remove({"deps": ["x"]}, "deps", item="x")
    assert "deps" not in out


def test_rm_item_drops_whole_key_when_scalar_equal():
    out = remove({"kind": "concept"}, "kind", item="concept")
    assert "kind" not in out
