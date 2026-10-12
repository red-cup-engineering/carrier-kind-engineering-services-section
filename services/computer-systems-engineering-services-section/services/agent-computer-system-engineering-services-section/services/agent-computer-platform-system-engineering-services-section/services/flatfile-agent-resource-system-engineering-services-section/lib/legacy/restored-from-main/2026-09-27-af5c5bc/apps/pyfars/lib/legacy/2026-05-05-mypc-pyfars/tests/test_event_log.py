"""Tests for pyfars.runtime.event_log."""
from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog


def test_event_log_append_and_read(tmp_path):
    log = EventLog(root=tmp_path)
    w1 = make_witness("fm_add", "a.md", None, "h1", details={"k": "v"})
    w2 = make_witness("fm_set", "b.md", "h2", "h3", details={"k": "v2"})
    log.append(w1)
    log.append(w2)
    all_w = list(log.read_all())
    assert len(all_w) == 2
    assert all_w[0] == w1
    assert all_w[1] == w2


def test_event_log_count(tmp_path):
    log = EventLog(root=tmp_path)
    assert log.count() == 0
    log.append(make_witness("op", "x.md", None, "h", details={}))
    assert log.count() == 1


def test_event_log_tail(tmp_path):
    log = EventLog(root=tmp_path)
    for i in range(5):
        log.append(make_witness("op", f"f{i}.md", None, f"h{i}", details={"i": i}))
    last3 = log.tail(3)
    assert len(last3) == 3
    assert last3[0].details["i"] == 2
    assert last3[2].details["i"] == 4


def test_event_log_tail_empty(tmp_path):
    log = EventLog(root=tmp_path)
    assert log.tail(5) == []


def test_event_log_creates_dir(tmp_path):
    log = EventLog(root=tmp_path)
    assert not log.log_dir.exists()
    log.append(make_witness("op", "x.md", None, "h", details={}))
    assert log.log_dir.exists()
    assert log.log_dir.is_dir()


def test_event_log_skips_blank_lines(tmp_path):
    log = EventLog(root=tmp_path)
    log.append(make_witness("op", "x.md", None, "h", details={}))
    # Manually inject a blank line
    log_file = next(log.log_dir.glob("*.jsonl"))
    with log_file.open("a", encoding="utf-8") as f:
        f.write("\n\n")
    log.append(make_witness("op2", "y.md", None, "h", details={}))
    assert log.count() == 2


# --- channel/origin/operator filters (FARS messaging-and-events analysis) ---

def _seed(log: EventLog) -> None:
    log.append(make_witness("fm_add", "a.md", None, "h",
                            channel="substrate"))
    log.append(make_witness("dispatch", "msg-1", None, "h",
                            channel="dispatch", origin="hook:pre-tool-use"))
    log.append(make_witness("tick", "n.md", None, None,
                            channel="heartbeat",
                            origin="heartbeat:selection:broken-link"))
    log.append(make_witness("lesson", "lesson/p", None, None,
                            channel="learning"))


def test_read_all_filters_by_channel(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    chans = [w.channel for w in log.read_all(channel="dispatch")]
    assert chans == ["dispatch"]


def test_read_all_filters_by_channel_iterable(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    got = {w.channel for w in
           log.read_all(channel=["dispatch", "heartbeat"])}
    assert got == {"dispatch", "heartbeat"}


def test_read_all_filters_by_origin_and_operator(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    got = list(log.read_all(operator="tick"))
    assert len(got) == 1
    assert got[0].origin == "heartbeat:selection:broken-link"
    assert list(log.read_all(origin="hook:pre-tool-use"))[0].operator == \
        "dispatch"


def test_read_all_no_filter_yields_all(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    assert sum(1 for _ in log.read_all()) == 4


def test_tail_applies_filter_before_slicing(tmp_path):
    log = EventLog(root=tmp_path)
    for i in range(3):
        log.append(make_witness("fm_add", f"a{i}.md", None, "h",
                                channel="substrate", details={"i": i}))
    for i in range(2):
        log.append(make_witness("tick", f"n{i}.md", None, None,
                                channel="heartbeat", details={"i": i}))
    last = log.tail(5, channel="heartbeat")
    assert len(last) == 2
    assert all(w.channel == "heartbeat" for w in last)


def test_count_with_filter(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    assert log.count(channel="learning") == 1
    assert log.count() == 4
    assert log.count(channel="absent") == 0


def test_channels_returns_distinct_sorted(tmp_path):
    log = EventLog(root=tmp_path)
    _seed(log)
    log.append(make_witness("fm_set", "a.md", "h", "h2",
                            channel="substrate"))  # duplicate channel
    assert log.channels() == [
        "dispatch", "heartbeat", "learning", "substrate",
    ]


def test_read_all_filter_accepts_one_shot_iterable(tmp_path):
    """Generator filters must be normalized once at the API boundary;
    a naive per-witness ``set(want)`` would consume the generator
    after the first comparison and silently drop later matches."""
    log = EventLog(root=tmp_path)
    _seed(log)
    gen = (c for c in ("dispatch", "heartbeat", "learning"))
    got = {w.channel for w in log.read_all(channel=gen)}
    assert got == {"dispatch", "heartbeat", "learning"}


def test_channels_ignores_unchannelled_witnesses(tmp_path):
    log = EventLog(root=tmp_path)
    log.append(make_witness("fm_add", "a.md", None, "h"))  # no channel
    log.append(make_witness("tick", "n.md", None, None,
                            channel="heartbeat"))
    assert log.channels() == ["heartbeat"]
