#!/usr/bin/env python3
"""Seed script to populate the `challenges_badges` collection.

Usage:
    python back-end/scripts/seed_badges.py [--dry-run]

By default the script upserts documents into the DB. Pass `--dry-run` to
only print the documents that would be written.
"""
import argparse
import asyncio
import sys
from typing import List

from motor.motor_asyncio import AsyncIOMotorClient

try:
    # allow running from repo root
    from config import MONGODB_URI, MONGODB_DB_NAME
except Exception:
    # adjust path and retry
    import pathlib
    repo_root = pathlib.Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(repo_root / "back-end"))
    from config import MONGODB_URI, MONGODB_DB_NAME


BADGES: List[dict] = [
    {"title": "First Scan", "type": "scan", "description": "Scan your first road", "target_value": 1, "accent": "#49B36A", "icon": "scan"},
    {"title": "Pothole Hunter", "type": "pothole", "description": "Report 5 potholes", "target_value": 5, "accent": "#FF8A3D", "icon": "pothole"},
    {"title": "Sign Spotter", "type": "sign", "description": "Detect 10 road signs", "target_value": 10, "accent": "#4C7DFF", "icon": "sign"},
    {"title": "Safe Route", "type": "shield", "description": "Scan 3 safe roads", "target_value": 3, "accent": "#2FBF71", "icon": "shield"},
    {"title": "City Explorer", "type": "explore", "description": "Use the app in new areas", "target_value": 10, "accent": "#7C3AED", "icon": "explore"},
    {"title": "Active User", "type": "streak", "description": "Open the app 7 days in a row", "target_value": 7, "accent": "#F59E0B", "icon": "streak"},
    {"title": "Night Patrol", "type": "night", "description": "Scan roads at night", "target_value": 5, "accent": "#0EA5A4", "icon": "night"},
    {"title": "Road Protector", "type": "report", "description": "Report 20 road problems", "target_value": 20, "accent": "#EF4444", "icon": "report"},
    {"title": "Community Helper", "type": "confirm", "description": "Confirm other users’ reports", "target_value": 10, "accent": "#06B6D4", "icon": "community"},
    {"title": "Long Ride", "type": "distance", "description": "Scan 50 km of roads", "target_value": 50, "accent": "#2563EB", "icon": "distance"},
    {"title": "AI Assistant", "type": "ai", "description": "Use AI scanning 25 times", "target_value": 25, "accent": "#8B5CF6", "icon": "ai"},
    {"title": "Danger Alert", "type": "danger", "description": "Report a critical road issue", "target_value": 1, "accent": "#DC2626", "icon": "danger"},
    {"title": "Perfect Accuracy", "type": "accuracy", "description": "Get 95% accurate reports", "target_value": 95, "accent": "#10B981", "icon": "accuracy"},
    {"title": "Master Scanner", "type": "master", "description": "Complete all basic challenges", "target_value": 1, "accent": "#F97316", "icon": "master"},
]


def slugify(text: str) -> str:
    s = text.lower()
    s = s.replace("’", "'")
    for ch in " /\\,:;()[]":
        s = s.replace(ch, "-")
    s = "-".join(part for part in s.split("-") if part)
    return s


async def run(dry_run: bool) -> None:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    coll = db.get_collection("challenges_badges")

    ops = []
    for b in BADGES:
        doc = {
            "id": slugify(b["title"]),
            "type": b["type"],
            "title": b["title"],
            "description": b["description"],
            "target_value": int(b["target_value"]),
            "icon": b.get("icon"),
            "accent": b.get("accent"),
        }
        ops.append(doc)

    if dry_run:
        print("Dry run - documents to upsert:")
        for d in ops:
            print(d)
        client.close()
        return

    for d in ops:
        filter_ = {"id": d["id"]}
        await coll.update_one(filter_, {"$set": d}, upsert=True)
        print(f"Upserted badge: {d['id']}")

    client.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print documents without writing")
    args = parser.parse_args()

    asyncio.run(run(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
