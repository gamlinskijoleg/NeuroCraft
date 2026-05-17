from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

from config import MONGODB_DB_NAME, MONGODB_URI

_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> None:
    global _client, _database

    if _client is not None and _database is not None:
        return

    _client = AsyncIOMotorClient(
        MONGODB_URI,
        maxPoolSize=100,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )
    _database = _client[MONGODB_DB_NAME]

    await _database.command("ping")

    users = _database.get_collection("users")
    await users.create_indexes(
        [
            IndexModel([("email", ASCENDING)], unique=True, name="uq_users_email"),
        ]
    )

    # Ensure indexes for gamification badges
    badges = _database.get_collection("challenges_badges")
    await badges.create_indexes(
        [
            IndexModel([("id", ASCENDING)], unique=True, name="uq_badges_id"),
            IndexModel([("type", ASCENDING)], name="ix_badges_type"),
        ]
    )


async def close_mongo_connection() -> None:
    global _client, _database

    if _client is not None:
        _client.close()
    _client = None
    _database = None


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB is not initialized")
    return _database


def get_users_collection() -> AsyncIOMotorCollection:
    return get_database().get_collection("users")
