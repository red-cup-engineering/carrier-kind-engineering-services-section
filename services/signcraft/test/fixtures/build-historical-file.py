"""Test fixture builder: writes the earlier relational history file from legacy-history.json (stdlib only)."""
import json, sqlite3, sys

fixture = json.load(open(sys.argv[1]))
connection = sqlite3.connect(sys.argv[2])
for table in fixture["tables"]:
    connection.execute(table["sql"])
    for row in table["rows"]:
        names = list(row)
        connection.execute("INSERT INTO " + table["name"] + "(" + ",".join(names) + ") VALUES(" + ",".join("?" * len(names)) + ")", [row[n] for n in names])
connection.commit()
connection.close()
