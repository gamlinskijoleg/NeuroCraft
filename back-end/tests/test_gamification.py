import asyncio
import datetime
from types import SimpleNamespace

import pytest

from gamification import track_action, TrackActionRequest


class FakeUsersCollection:
    def __init__(self, users):
        self.users = users

    async def update_one(self, filter_, update, session=None, array_filters=None):
        # simple filter on _id
        uid = filter_.get("_id")
        user = self.users.get(uid)
        # emulate matched_count behavior
        class Res:
            def __init__(self, matched):
                self.matched_count = 1 if matched else 0

        if user is None:
            return Res(False)

        # handle positional $ inc (challenges_progress.$.current_value) via query match
        if "challenges_progress.badge_id" in filter_:
            bid = filter_["challenges_progress.badge_id"]
            found = False
            for elem in user.setdefault("challenges_progress", []):
                if elem.get("badge_id") == bid:
                    if "$inc" in update:
                        # increment current_value
                        inc_val = update["$inc"].get("challenges_progress.$.current_value", 0)
                        elem["current_value"] = elem.get("current_value", 0) + inc_val
                    found = True
                    break
            return Res(found)

        # handle $inc (generic: statistics)
        if "$inc" in update:
            for k, v in update["$inc"].items():
                # support nested statistics.field
                parts = k.split(".")
                if parts[0] == "statistics":
                    user.setdefault("statistics", {})
                    key = parts[1]
                    user["statistics"][key] = user["statistics"].get(key, 0) + v
            return Res(True)

        # handle $push
        if "$push" in update:
            for k, v in update["$push"].items():
                if k == "challenges_progress":
                    user.setdefault("challenges_progress", [])
                    user["challenges_progress"].append(v)
                if k == "achievements":
                    user.setdefault("achievements", [])
                    user["achievements"].append(v)
            return Res(True)

        # handle $set with array_filters
        if "$set" in update and array_filters:
            # array_filters like [{"elem.badge_id": bid, "elem.is_completed": False}]
            for af in array_filters:
                bid = af.get("elem.badge_id")
                for elem in user.get("challenges_progress", []):
                    if elem.get("badge_id") == bid and not elem.get("is_completed"):
                        # set fields
                        for field, val in update["$set"].items():
                            # field example: challenges_progress.$[elem].is_completed
                            if field.endswith("is_completed"):
                                elem["is_completed"] = val
                            if field.endswith("unlocked_at"):
                                elem["unlocked_at"] = val
            return Res(True)

        # handle positional $ inc (challenges_progress.$.current_value) via query match
        if "challenges_progress.badge_id" in filter_:
            bid = filter_["challenges_progress.badge_id"]
            found = False
            for elem in user.setdefault("challenges_progress", []):
                if elem.get("badge_id") == bid:
                    if "$inc" in update:
                        # increment current_value
                        inc_val = update["$inc"].get("challenges_progress.$.current_value", 0)
                        elem["current_value"] = elem.get("current_value", 0) + inc_val
                    found = True
                    break
            return Res(found)

        return Res(True)

    async def find_one(self, filter_, projection=None, session=None):
        uid = filter_.get("_id")
        return self.users.get(uid)


class FakeBadgesCollection:
    def __init__(self, badges):
        self.badges = badges

    def find(self, query):
        # return an async iterator over badges matching type
        typ = query.get("type")

        async def gen():
            for b in self.badges:
                if typ is None or b.get("type") == typ:
                    yield b

        return gen()

    async def find_one(self, query, session=None):
        # support $or: [{id:bid},{_id:bid}]
        if "$or" in query:
            for cond in query["$or"]:
                if "id" in cond:
                    bid = cond["id"]
                    for b in self.badges:
                        if b.get("id") == bid or str(b.get("_id")) == bid:
                            return b
        # fallback
        return None


class FakeDB:
    def __init__(self, users, badges):
        self._users = users
        self._badges = badges
        # provide a fake client with start_session to satisfy gamification logic
        class FakeSession:
            def start_transaction(self):
                class TXCtx:
                    async def __aenter__(self_inner):
                        return None

                    async def __aexit__(self_inner, exc_type, exc, tb):
                        return False

                return TXCtx()

            async def end_session(self):
                return None

        class FakeClient:
            async def start_session(self):
                return FakeSession()

        self.client = FakeClient()

    def get_collection(self, name):
        if name == "challenges_badges":
            return FakeBadgesCollection(self._badges)
        return None


@pytest.mark.asyncio
async def test_track_scan_grants_first_scan(monkeypatch):
    user_id = "297d1912-7a0d-4014-a5f4-f52cd11ef52a"

    # initial empty user
    users = {
        user_id: {"_id": user_id}
    }

    fake_users = FakeUsersCollection(users)

    # badges contains first-scan badge
    badges = [
        {"id": "first-scan", "type": "scan", "title": "First Scan", "target_value": 1}
    ]

    fake_db = FakeDB(users, badges)

    # monkeypatch database accessors in gamification module
    import gamification

    monkeypatch.setattr(gamification, "get_users_collection", lambda: fake_users)
    monkeypatch.setattr(gamification, "get_database", lambda: fake_db)

    # monkeypatch token decode to accept any token and set sub
    monkeypatch.setattr(gamification, "decode_access_token", lambda t: {"sub": user_id})

    # create fake creds
    creds = SimpleNamespace(scheme="bearer", credentials="token")

    # call track_action
    resp = await track_action(user_id, TrackActionRequest(action_type="scan", increment=1), creds)
    assert resp.get("success") is True

    # verify user doc updated
    u = users[user_id]
    assert u.get("statistics", {}).get("total_scans") == 1
    assert any(p.get("badge_id") == "first-scan" for p in u.get("challenges_progress", []))
    assert any(a.get("badge_id") == "first-scan" for a in u.get("achievements", []))
