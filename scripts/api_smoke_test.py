"""
Smoke test for the complaints API, using the real models.

1. Start the server in one terminal:   cd backend && python manage.py runserver --noreload
2. Run this in another terminal:       python scripts/api_smoke_test.py
"""
import glob
import os
import random
import time

import requests

BASE = os.environ.get("API_URL", "http://127.0.0.1:8000/api")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMG_ROOT = os.path.join(ROOT, "data", "CivicIssuesImageDataset", "test")

ROADS = "Roads Department"
WASTE = "Solid Waste Management"
DRAINAGE = "Drainage & Sewerage"

timings = []


def photo(image_class):
    files = glob.glob(os.path.join(IMG_ROOT, image_class, "*"))
    return random.choice(files) if files else None


def submit(label, description=None, image_class=None, lat=27.7172, lon=85.3240,
           expect=None, location_type=""):
    data = {"lat": lat, "lon": lon}
    if description:
        data["description"] = description
    if location_type:
        data["location_type"] = location_type

    path = photo(image_class) if image_class else None
    if image_class and path is None:
        print(f"{label:<28} SKIPPED (no images found for {image_class})")
        return None

    start = time.time()
    if path:
        with open(path, "rb") as fh:
            resp = requests.post(f"{BASE}/complaints/", data=data, files={"image": fh}, timeout=300)
    else:
        resp = requests.post(f"{BASE}/complaints/", data=data, timeout=300)
    elapsed = time.time() - start
    timings.append((label, elapsed))

    if resp.status_code != 201:
        print(f"{label:<28} FAILED {resp.status_code}: {resp.text[:200]}")
        return None

    r = resp.json()
    verdict = ""
    if expect:
        verdict = "OK   " if r["department"] == expect else "CHECK"
    print(f"{label:<28} {verdict} {elapsed:5.1f}s  id={r['id']:<3} {r['category'] or '-':<22} "
          f"{r['department']:<24} via {r['routing_source']:<9} review={str(r['needs_review']):<5} "
          f"urgency={r['urgency_level']:<6} dups={r['duplicate_count']} "
          f"priority={r['priority_score']} ({r['priority_level']})")
    return r


def main():
    print("== Single complaints ==")
    submit("romanized text", "road bigreko chha mhepi najikai", expect=ROADS, lat=27.7172, lon=85.3240)
    submit("devanagari text", "सडकमा ठूलो खाडल परेको छ", expect=ROADS, lat=27.7300, lon=85.3300)
    submit("english text", "Large pothole on the main road near the junction, bikes are skidding.",
           expect=ROADS, lat=27.7400, lon=85.3400)
    submit("drainage text", "nali jam bhayera pani sadak ma aayeko chha", expect=DRAINAGE,
           lat=27.7500, lon=85.3500)
    submit("image only (pothole)", image_class="Road_Issues_Pothole", expect=ROADS,
           lat=27.7600, lon=85.3600)
    submit("text + photo agree", "mhepi najikai road bigreko chha", image_class="Road_Issues_Pothole",
           expect=ROADS, lat=27.7700, lon=85.3700)
    submit("text + photo CONFLICT", "road bigreko chha, pothole ma gadi fasyo", image_class="Garbage_Waste_Trash",
           expect=WASTE, lat=27.7800, lon=85.3800)

    print("\n== Duplicate group: three rewordings at the same spot, then one 2 km away ==")
    first = submit("dup report 1", "kuda kadkat sadak ma overflow bhayeko chha", expect=WASTE,
                   lat=27.8000, lon=85.4000)
    submit("dup report 2", "sadak ma kuda kadkat overflow bhayeko chha", expect=WASTE,
           lat=27.8001, lon=85.4001)
    submit("dup report 3", "kuda kadkat overflow bhayeko chha sadak ma", expect=WASTE,
           lat=27.8002, lon=85.4002)
    submit("same text, 2 km away", "kuda kadkat sadak ma overflow bhayeko chha", expect=WASTE,
           lat=27.8200, lon=85.4000)

    if first:
        again = requests.get(f"{BASE}/complaints/{first['id']}/", timeout=30).json()
        print(f"\nReport 1 now: duplicate_count={again['duplicate_count']} "
              f"priority={again['priority_score']} ({again['priority_level']})   "
              f"(was {first['duplicate_count']} / {first['priority_score']} when submitted)")
        print("Expected: duplicate_count 2, priority higher than at submission. "
              "The report 2 km away should NOT be linked.")

    print("\n== Highest priority complaints ==")
    listing = requests.get(f"{BASE}/complaints/?limit=10", timeout=30).json()
    for c in listing:
        print(f"  #{c['id']:<3} {c['priority_score']:>5} {c['priority_level']:<8} {c['department']:<24} "
              f"dups={c['duplicate_count']}  {c['description'][:45]}")

    if timings:
        times = [t for _, t in timings]
        print(f"\nResponse time: first request {times[0]:.1f}s, "
              f"average {sum(times) / len(times):.1f}s, slowest {max(times):.1f}s")


if __name__ == "__main__":
    main()