from __future__ import annotations

from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from database import get_database, get_users_collection
from security import decode_access_token

"""Gamification API router.

Provides endpoints to fetch user challenges and achievements and to track
user actions. All endpoints require a bearer token; the token subject must
match the requested `user_id`.
"""

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


class ChallengeBadge(BaseModel):
    id: str = Field(..., description="Badge id (string or ObjectId as str)")
    type: str
    title: str
    description: str
    target_value: int
    icon_url_active: Optional[str] = None
    icon_url_locked: Optional[str] = None


class TrackActionRequest(BaseModel):
    action_type: str
    increment: int = Field(1, ge=1)


class ChallengeProgressResponse(BaseModel):
    id: str
    type: Optional[str]
    title: Optional[str]
    description: Optional[str]
    target_value: Optional[int]
    icon_url_active: Optional[str]
    icon_url_locked: Optional[str]
    current_value: int
    is_completed: bool
    unlocked_at: Optional[datetime]


class AchievementResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    target_value: int
    icon_url_active: Optional[str]
    icon_url_locked: Optional[str]
    is_locked: bool


class ChallengesListResponse(BaseModel):
    success: bool = True
    message: str
    challenges: List[ChallengeProgressResponse]


class AchievementsListResponse(BaseModel):
    success: bool = True
    message: str
    achievements: List[AchievementResponse]


@router.get("/{user_id}/challenges", response_model=ChallengesListResponse)
async def get_user_challenges(user_id: str, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """Return user's challenge progress joined with badge definitions.

    Requires a bearer token whose `sub` equals `user_id`.
    """
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(creds.credentials)
    subject = payload.get("sub") if payload else None
    if not subject or subject != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    users = get_users_collection()
    db = get_database()
    badges_coll = db.get_collection("challenges_badges")

    # Build aggregation pipeline to join user progress with badges
    pipeline = [
        {"$match": {"_id": user_id}},
        {"$unwind": {"path": "$challenges_progress", "preserveNullAndEmptyArrays": False}},
        {
            "$lookup": {
                "from": "challenges_badges",
                "localField": "challenges_progress.badge_id",
                "foreignField": "id",
                "as": "badge",
            }
        },
        {"$unwind": {"path": "$badge", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "id": "$badge.id",
                "type": "$badge.type",
                "title": "$badge.title",
                "description": "$badge.description",
                "target_value": "$badge.target_value",
                "icon_url_active": "$badge.icon_url_active",
                "icon_url_locked": "$badge.icon_url_locked",
                "current_value": "$challenges_progress.current_value",
                "is_completed": "$challenges_progress.is_completed",
                "unlocked_at": "$challenges_progress.unlocked_at",
            }
        },
    ]

    cursor = users.aggregate(pipeline)
    results = []
    async for doc in cursor:
        results.append(
            ChallengeProgressResponse(
                id=str(doc.get("id") or doc.get("badge", {}).get("id") or ""),
                type=doc.get("type"),
                title=doc.get("title"),
                description=doc.get("description"),
                target_value=doc.get("target_value") or 0,
                icon_url_active=doc.get("icon_url_active"),
                icon_url_locked=doc.get("icon_url_locked"),
                current_value=int(doc.get("current_value") or 0),
                is_completed=bool(doc.get("is_completed") or False),
                unlocked_at=doc.get("unlocked_at"),
            )
        )

    return ChallengesListResponse(message="User challenges fetched", challenges=results)


@router.get("/{user_id}/achievements", response_model=AchievementsListResponse)
async def get_user_achievements(user_id: str, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """Return available achievements and whether each is unlocked for the user.

    Prefers explicit `achievements` array on user documents; falls back to
    `challenges_progress` when needed. Requires matching bearer token.
    """
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(creds.credentials)
    subject = payload.get("sub") if payload else None
    if not subject or subject != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    db = get_database()
    users = get_users_collection()
    badges_coll = db.get_collection("challenges_badges")

    badges = []
    async for b in badges_coll.find({}):
        badges.append(b)

    user = await users.find_one({"_id": user_id}, {"achievements": 1, "challenges_progress": 1})
    unlocked = set()
    if user:
        if user.get("achievements"):
            for a in user.get("achievements"):
                unlocked.add(str(a.get("badge_id")))
        elif user.get("challenges_progress"):
            for p in user.get("challenges_progress"):
                if p.get("is_completed"):
                    unlocked.add(str(p.get("badge_id")))

    out = []
    for b in badges:
        bid = str(b.get("id") or b.get("_id"))
        out.append(
            AchievementResponse(
                id=bid,
                type=b.get("type", ""),
                title=b.get("title", ""),
                description=b.get("description", ""),
                target_value=int(b.get("target_value", 0)),
                icon_url_active=b.get("icon_url_active"),
                icon_url_locked=b.get("icon_url_locked"),
                is_locked=(bid not in unlocked),
            )
        )

    return AchievementsListResponse(message="Achievements fetched", achievements=out)


@router.post("/{user_id}/track", status_code=status.HTTP_200_OK)
async def track_action(user_id: str, payload: TrackActionRequest, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload_token = decode_access_token(creds.credentials)
    subject = payload_token.get("sub") if payload_token else None
    if not subject or subject != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    users = get_users_collection()
    db = get_database()
    badges_coll = db.get_collection("challenges_badges")

    ACTION_TO_STAT = {
        "pothole": "total_potholes_reported",
        "sign": "total_signs_detected",
        "scan": "total_scans",
    }

    stat_key = ACTION_TO_STAT.get(payload.action_type) or payload.action_type
    stat_field = f"statistics.{stat_key}"

    # Find badges that match this action type
    badge_cursor = badges_coll.find({"type": payload.action_type})
    badges = [b async for b in badge_cursor]
    """Update user's statistics and progress; grant achievements when targets reached.

    The implementation attempts a transaction for atomicity. If transactions
    are not available (standalone MongoDB), it falls back to best-effort updates.
    """
    client = db.client
    now = datetime.now(timezone.utc)
    session = None
    try:
        session = await client.start_session()
        try:
            async with session.start_transaction():
                # increment statistics counter
                await users.update_one({"_id": user_id}, {"$inc": {stat_field: payload.increment}}, session=session)

                # increment or add progress entries for matching badges
                for b in badges:
                    bid = str(b.get("id") or b.get("_id"))
                    res = await users.update_one(
                        {"_id": user_id, "challenges_progress.badge_id": bid},
                        {"$inc": {"challenges_progress.$.current_value": payload.increment}},
                        session=session,
                    )
                    if res.matched_count == 0:
                        new_progress = {
                            "badge_id": bid,
                            "current_value": payload.increment,
                            "is_completed": False,
                            "unlocked_at": None,
                        }
                        await users.update_one({"_id": user_id}, {"$push": {"challenges_progress": new_progress}}, session=session)

                # mark completed badges and push achievements
                user = await users.find_one({"_id": user_id}, {"challenges_progress": 1, "achievements": 1}, session=session)
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")

                progress_list = user.get("challenges_progress") or []
                target_map = {str(b.get("id") or b.get("_id")): int(b.get("target_value", 0)) for b in badges}

                for p in progress_list:
                    bid = str(p.get("badge_id"))
                    if bid not in target_map:
                        continue
                    if bool(p.get("is_completed")):
                        continue
                    if int(p.get("current_value", 0)) >= target_map.get(bid, 0):
                        # mark completed in array
                        await users.update_one(
                            {"_id": user_id},
                            {"$set": {"challenges_progress.$[elem].is_completed": True, "challenges_progress.$[elem].unlocked_at": now}},
                            array_filters=[{"elem.badge_id": bid, "elem.is_completed": False}],
                            session=session,
                        )
                        # push to achievements if missing
                        badge_doc = await badges_coll.find_one({"$or": [{"id": bid}, {"_id": bid}]}, session=session)
                        badge_title = badge_doc.get("title") if badge_doc else None
                        await users.update_one(
                            {"_id": user_id, "$or": [{"achievements": {"$exists": False}}, {"achievements.badge_id": {"$ne": bid}}]},
                            {"$push": {"achievements": {"badge_id": bid, "title": badge_title, "unlocked_at": now}}},
                            session=session,
                        )
        except Exception:
            # Transaction failed — fall back to best-effort updates
            if session is not None:
                await session.end_session()
                session = None

            # increment statistics counter
            await users.update_one({"_id": user_id}, {"$inc": {stat_field: payload.increment}})

            # update or create progress entries for matching badges
            for b in badges:
                bid = str(b.get("id") or b.get("_id"))
                res = await users.update_one(
                    {"_id": user_id, "challenges_progress.badge_id": bid},
                    {"$inc": {"challenges_progress.$.current_value": payload.increment}},
                )
                if res.matched_count == 0:
                    new_progress = {
                        "badge_id": bid,
                        "current_value": payload.increment,
                        "is_completed": False,
                        "unlocked_at": None,
                    }
                    await users.update_one({"_id": user_id}, {"$push": {"challenges_progress": new_progress}})
            # evaluate completions and grant achievements
            user = await users.find_one({"_id": user_id}, {"challenges_progress": 1, "achievements": 1})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            progress_list = user.get("challenges_progress") or []
            target_map = {str(b.get("id") or b.get("_id")): int(b.get("target_value", 0)) for b in badges}

            for p in progress_list:
                bid = str(p.get("badge_id"))
                if bid not in target_map:
                    continue
                if bool(p.get("is_completed")):
                    continue
                if int(p.get("current_value", 0)) >= target_map.get(bid, 0):
                    await users.update_one(
                        {"_id": user_id},
                        {"$set": {"challenges_progress.$[elem].is_completed": True, "challenges_progress.$[elem].unlocked_at": now}},
                        array_filters=[{"elem.badge_id": bid, "elem.is_completed": False}],
                    )
                    badge_doc = await badges_coll.find_one({"$or": [{"id": bid}, {"_id": bid}]})
                    badge_title = badge_doc.get("title") if badge_doc else None
                    await users.update_one(
                        {"_id": user_id, "$or": [{"achievements": {"$exists": False}}, {"achievements.badge_id": {"$ne": bid}}]},
                        {"$push": {"achievements": {"badge_id": bid, "title": badge_title, "unlocked_at": now}}},
                    )
    finally:
        if session is not None:
            await session.end_session()

    return {"success": True, "message": "Action tracked"}
