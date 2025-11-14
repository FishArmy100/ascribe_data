import sys
import os
import csv

if len(sys.argv) < 2:
    raise RuntimeError("You must pass a file path")
elif len(sys.argv) > 2:
    raise RuntimeError("More than 1 argument was supplied")

path = sys.argv[1]

if not os.path.isfile(path):
    raise RuntimeError(f"File path {path} is not a valid path")

_, ext = os.path.splitext(path)
if not ext == ".csv":
    raise RuntimeError(f"File path {path} is not a json csv")

print(f"Reading file: {path}...")
data: list[list[str]] = []
with open(path, 'r', newline='', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        data.append(row)

print("Writing to file: out.jsonl...")

id = 0
with open('strongs_defs.jsonl', 'w', encoding='utf-8') as file:
    for i in range(len(data)):
        row = data[i]
        if len(row) != 5:
            print(f"Row {i} has {len(row)} columns")

        def_str = f"<h2><b>Definitions:</b></h2><p>{row[3].replace("\"", "\\\"")}</p><br><h2><b>Derivation:</b></h2><p>{row[4].replace("\"", "\\\"")}</p>"
        file.write(f"{{ \"strongs_ref\": \"{row[0]}\", \"definition\": \"{def_str}\", \"word\": \"{row[1]}\", \"id\": {id} }}\n")
        id += 1

print("Done!")