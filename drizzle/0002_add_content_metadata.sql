-- Migration: Add enhanced metadata fields for NSFW filtering
-- Generated: 2024-12-21

-- Add tags column for storing all addon-provided tags/keywords
ALTER TABLE contents ADD COLUMN tags TEXT DEFAULT '[]';

-- Add age_rating column for storing age ratings like "G", "PG", "R", etc.
ALTER TABLE contents ADD COLUMN age_rating TEXT;

-- Add content_rating column for computed NSFW classification
ALTER TABLE contents ADD COLUMN content_rating TEXT DEFAULT 'safe';

-- Add popularity column for sorting
ALTER TABLE contents ADD COLUMN popularity INTEGER;

-- Add release_date column for seasonal filtering
ALTER TABLE contents ADD COLUMN release_date TEXT;
