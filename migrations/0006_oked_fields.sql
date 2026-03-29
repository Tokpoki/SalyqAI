-- Add OKED fields to taxpayer_profiles
ALTER TABLE taxpayer_profiles ADD COLUMN oked_code TEXT;
ALTER TABLE taxpayer_profiles ADD COLUMN oked_name TEXT;
ALTER TABLE taxpayer_profiles ADD COLUMN oked_banned INTEGER DEFAULT 0;
