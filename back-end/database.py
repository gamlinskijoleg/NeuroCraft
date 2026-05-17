"""Database connection helpers and initial setup.

Creates common indexes and applies a JSON Schema validator for
`challenges_badges` during startup.
"""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel
from pymongo.errors import OperationFailure

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

    # Create indexes for the badges collection
    badges = _database.get_collection("challenges_badges")
    await badges.create_indexes(
        [
            IndexModel([("id", ASCENDING)], unique=True, name="uq_badges_id"),
            IndexModel([("type", ASCENDING)], name="ix_badges_type"),
        ]
    )

    # Apply JSON Schema validator for `challenges_badges`
    badge_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "type", "title", "target_value"],
            "properties": {
                "id": {"bsonType": "string"},
                "type": {"bsonType": "string"},
                "title": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "target_value": {"bsonType": "int"},
                "icon_url_active": {"bsonType": ["string", "null"]},
                "icon_url_locked": {"bsonType": ["string", "null"]},
            },
        }
    }

    # Use collMod to attach validator, or create the collection if missing
    try:
        await _database.command(
            {
                "collMod": "challenges_badges",
                "validator": badge_validator,
                "validationLevel": "moderate",
            }
        )
    except OperationFailure:
        # collMod may fail if the collection doesn't exist; create it with validator
        existing = await _database.list_collection_names()
        if "challenges_badges" not in existing:
            await _database.create_collection(
                "challenges_badges", validator=badge_validator, validationLevel="moderate"
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
