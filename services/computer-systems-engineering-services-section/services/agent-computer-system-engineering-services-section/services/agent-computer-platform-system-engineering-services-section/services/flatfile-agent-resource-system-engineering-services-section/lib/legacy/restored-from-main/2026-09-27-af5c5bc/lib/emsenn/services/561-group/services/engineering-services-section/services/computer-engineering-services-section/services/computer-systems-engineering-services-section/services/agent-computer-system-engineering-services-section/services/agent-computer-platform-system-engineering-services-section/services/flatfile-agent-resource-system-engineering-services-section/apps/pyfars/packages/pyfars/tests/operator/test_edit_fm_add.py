from pyfars.operator.edit.fm_add import add_item


def test_add_creates_list_if_absent():
    out = add_item({}, "deps", "x")
    assert out == {"deps": ["x"]}


def test_add_appends_to_existing_list():
    out = add_item({"deps": ["x"]}, "deps", "y")
    assert out == {"deps": ["x", "y"]}


def test_add_dedup_no_op_if_present():
    out = add_item({"deps": ["x"]}, "deps", "x")
    assert out == {"deps": ["x"]}


def test_add_promotes_scalar_to_list():
    out = add_item({"deps": "x"}, "deps", "y")
    assert out == {"deps": ["x", "y"]}


def test_add_does_not_mutate_input():
    fm = {"deps": ["x"]}
    add_item(fm, "deps", "y")
    assert fm == {"deps": ["x"]}
