import re
import os
import sys

wxs = sys.argv[1]
paths = re.findall(r'Source(?:File)?="([^"]+)"', open(wxs, encoding="utf-8", errors="ignore").read())
bad = []
for p in paths:
    try:
        p.encode("cp1252")
    except UnicodeEncodeError as e:
        bad.append((p, str(e)))
print(f"non_cp1252_paths={len(bad)}")
for p, err in bad[:8]:
    print(repr(p[-60:]))
