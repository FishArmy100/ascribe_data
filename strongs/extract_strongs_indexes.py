import subprocess

# Run the diatheke command
result = subprocess.run(
    ["diatheke", "-b", "ASV", "-k", "Genesis 1:1", "-f", "OSIS"],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

# Write the output to test.xml
with open("strongs_word_indexes.txt", "w", encoding="utf-8") as f:
    f.write(result.stdout)
