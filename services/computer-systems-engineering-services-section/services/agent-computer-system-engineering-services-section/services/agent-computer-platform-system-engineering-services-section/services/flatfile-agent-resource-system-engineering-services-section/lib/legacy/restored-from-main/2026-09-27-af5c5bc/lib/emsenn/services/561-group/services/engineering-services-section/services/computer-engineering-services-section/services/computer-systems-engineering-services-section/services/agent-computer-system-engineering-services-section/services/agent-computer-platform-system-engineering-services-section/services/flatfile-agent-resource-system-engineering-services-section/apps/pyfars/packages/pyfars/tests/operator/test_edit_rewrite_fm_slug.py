from pyfars.operator.edit.rewrite_fm_slug import rewrite


def test_rewrite_list_value_relation():
    fm = {"depends-on": ["alpha", "beta"]}
    new_fm, changes = rewrite(fm, "alpha", "objects-alpha")
    assert new_fm == {"depends-on": ["objects-alpha", "beta"]}
    assert changes == 1


def test_rewrite_scalar_value_relation():
    fm = {"see-also": "alpha"}
    new_fm, changes = rewrite(fm, "alpha", "objects-alpha")
    assert new_fm == {"see-also": "objects-alpha"}
    assert changes == 1


def test_rewrite_path_y_value_normalizes_before_comparison():
    fm = {"depends-on": ["../concepts/alpha.md"]}
    new_fm, changes = rewrite(fm, "alpha", "objects-alpha")
    assert new_fm == {"depends-on": ["objects-alpha"]}
    assert changes == 1


def test_rewrite_no_op_when_slug_absent():
    fm = {"depends-on": ["beta"]}
    new_fm, changes = rewrite(fm, "alpha", "objects-alpha")
    assert new_fm == {"depends-on": ["beta"]}
    assert changes == 0


def test_rewrite_does_not_mutate_input():
    fm = {"depends-on": ["alpha"]}
    rewrite(fm, "alpha", "objects-alpha")
    assert fm == {"depends-on": ["alpha"]}
