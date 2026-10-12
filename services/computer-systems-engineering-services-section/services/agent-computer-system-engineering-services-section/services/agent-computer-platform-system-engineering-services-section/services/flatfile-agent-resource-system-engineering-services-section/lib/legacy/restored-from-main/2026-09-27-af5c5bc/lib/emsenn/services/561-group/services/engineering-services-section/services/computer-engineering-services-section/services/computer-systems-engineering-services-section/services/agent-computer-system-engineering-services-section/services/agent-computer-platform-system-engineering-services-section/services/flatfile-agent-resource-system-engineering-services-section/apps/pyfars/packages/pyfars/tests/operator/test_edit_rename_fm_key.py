from pyfars.operator.edit.rename_fm_key import rename


def test_rename_fm_key_preserves_order():
    fm = {"a": 1, "old": 2, "c": 3}
    out = rename(fm, "old", "new")
    assert list(out.keys()) == ["a", "new", "c"]
    assert out["new"] == 2


def test_rename_fm_key_no_op_when_absent():
    fm = {"a": 1}
    assert rename(fm, "nonexistent", "x") is fm


def test_rename_fm_key_no_op_when_same_key():
    fm = {"a": 1}
    assert rename(fm, "a", "a") is fm


def test_rename_fm_key_new_key_wins_when_both_present():
    fm = {"old": 1, "new": 2}
    out = rename(fm, "old", "new")
    assert out == {"new": 2}
