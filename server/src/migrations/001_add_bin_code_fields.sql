-- PBLMS Migration 001: Add Bin Code and QR fields
-- Run: node src/migrations/run.js

ALTER TABLE Bin_Master
  ADD COLUMN Bin_Code VARCHAR(20) NULL UNIQUE AFTER Bin_Number,
  ADD COLUMN QR_Value VARCHAR(20) NULL AFTER Bin_Code,
  ADD COLUMN QR_Image VARCHAR(255) NULL AFTER QR_Value;
