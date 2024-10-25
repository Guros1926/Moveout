DROP DATABASE IF EXISTS content_db;
CREATE DATABASE content_db;
USE content_db;

-- Create users table (must be created first because content references it)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,  -- User's email
    password VARCHAR(255),               -- Password for non-Google users (can be NULL for Google users)
    google_id VARCHAR(255),              -- Google user ID
    name VARCHAR(255),                   -- User's full name (from Google)
    verification_token VARCHAR(64),      -- Token used for email verification (can be NULL for Google users)
    is_verified BOOLEAN DEFAULT 0,       -- Whether the email is verified (set to 1 for Google users)
    is_active BOOLEAN DEFAULT 1,         -- Whether the user account is active (1 = active, 0 = inactive)
    is_admin BOOLEAN DEFAULT 0           -- Flag to indicate if the user is an admin (1 = admin, 0 = regular user)
);

-- Create content table (ensure user_id matches exactly with users.user_id)
CREATE TABLE content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,         -- Title of the label
    content_type VARCHAR(10) NOT NULL,   -- 'text', 'image', 'video', 'audio'
    content TEXT NOT NULL,               -- Store the actual content
    icons VARCHAR(255),                  -- Store icons as a comma-separated string
    qr_code TEXT,                        -- Store the generated QR code as a base64 string
    is_private BOOLEAN DEFAULT 0,        -- Flag to indicate if the label is private
    pin_hash VARCHAR(255) DEFAULT NULL,  -- Store the hashed 6-digit PIN if private
    user_id INT,                         -- Reference to the user who owns this content
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE -- Properly form the foreign key
);

-- Procedure to insert content linked to a user (with title, icons, and QR code)
DROP PROCEDURE IF EXISTS insert_content;
DELIMITER //
CREATE PROCEDURE insert_content(
    IN p_title VARCHAR(255),
    IN p_content_type VARCHAR(10),
    IN p_content TEXT,
    IN p_icons VARCHAR(255),
    IN p_user_id INT,
    IN p_qr_code VARCHAR(255),
    IN p_is_private BOOLEAN,
    IN p_pin_hash VARCHAR(255)
)
BEGIN
    INSERT INTO content (title, content_type, content, icons, user_id, qr_code, is_private, pin_hash)
    VALUES (p_title, p_content_type, p_content, p_icons, p_user_id, p_qr_code, p_is_private, p_pin_hash);
    
    -- Return the last inserted ID
    SELECT LAST_INSERT_ID() AS insertId;
END //
DELIMITER ;


-- Insert the admin user
-- The password is 'moveout', hashed using bcrypt
INSERT INTO users (email, password, name, is_verified, is_admin)
VALUES ('admin123@example.com', '$2b$10$66vbsW2ifYohAiWtf/QU7O9GQyHI/G5aZ6Mk7ParFc0gBDmqBS/gC', 'Admin', 1, 1);
                                 