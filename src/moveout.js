const mysql = require("promise-mysql");
const config = require("./../config/db/moveout.json");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt"); 
const nodemailer = require('nodemailer');

// Insert content into the database 
async function insertContent(data) {
    const db = await mysql.createConnection(config);

    let pinHash = null;
    if (data.is_private && data.pin) {
        pinHash = await bcrypt.hash(data.pin, 10);
    }

    const sql = `CALL insert_content(?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await db.query(sql, [
        data.title,
        data.content_type,
        data.content,
        data.icons,
        data.user_id,
        data.qr_code || '',
        data.is_private || 0,
        pinHash
    ]);

    await db.end();
    return result[0][0].insertId;
}


// Update the label with the QR code path
async function updateLabelQRCode(labelId, qrCodePath) {
    const db = await mysql.createConnection(config);
    const sql = `UPDATE content SET qr_code = ? WHERE id = ?`;
    await db.query(sql, [qrCodePath, labelId]);
    await db.end();
}


// Function to fetch all labels for a specific user
async function getLabelsForUser(userId) {
    const db = await mysql.createConnection(config);
    const sql = `SELECT id, title, content_type, content, icons, qr_code FROM content WHERE user_id = ?`;  // Fetch qr_code as well
    const result = await db.query(sql, [userId]);
    await db.end();
    return result;
}

// Function to fetch a label by its ID
async function getLabelById(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `SELECT * FROM content WHERE id = ?`; 
    const result = await db.query(sql, [labelId]);
    await db.end();
    return result[0];  
}

// Function to update a label (title, content_type, content, icons)
async function updateLabel(labelId, { title, content_type, content, icons }) {
    const db = await mysql.createConnection(config);
    const sql = `UPDATE content SET title = ?, content_type = ?, content = ?, icons = ? WHERE id = ?`;
    await db.query(sql, [title, content_type, content, icons, labelId]);
    await db.end();
}


// Function to delete a label
async function deleteLabel(labelId) {
    const db = await mysql.createConnection(config);
    const sql = `DELETE FROM content WHERE id = ?`;  
    await db.query(sql, [labelId]);
    await db.end();
}

// Fetch a user by email
async function getUserByEmail(email) {
    const db = await mysql.createConnection(config);
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    await db.end();
    return result[0];  
}

async function getUserById(userId) {
    const db = await mysql.createConnection(config);
    const sql = 'SELECT * FROM users WHERE user_id = ?';  
    const result = await db.query(sql, [userId]);
    await db.end();
    
    return result.length > 0 ? result[0] : null;  
}

// Save a new Google user
async function saveGoogleUser(userData) {
    const db = await mysql.createConnection(config);
    const sql = 'INSERT INTO users (email, google_id, name, is_verified) VALUES (?, ?, ?, 1)';
    const result = await db.query(sql, [userData.email, userData.googleId, userData.name]);
    await db.end();
   
    return {
        user_id: result.insertId, 
        ...userData,
        is_verified: true
    };
}

// Function to update the storage used by a user
async function updateUserStorage(userId, fileSize) {
    const db = await mysql.createConnection(config);
    const sql = `UPDATE users SET storage_used = storage_used + ? WHERE user_id = ?`;
    await db.query(sql, [fileSize, userId]);
    await db.end();
}

async function getAllUsers() {
    const db = await mysql.createConnection(config);
    const result = await db.query('SELECT user_id, email, is_verified, is_active FROM users');
    await db.end();
    return result;
}

async function toggleUserActivation(userId) {
    const db = await mysql.createConnection(config);
    await db.query('UPDATE users SET is_active = NOT is_active WHERE user_id = ?', [userId]);
    await db.end();
}

async function getStorageUsageForAllUsers() {
    const db = await mysql.createConnection(config);
    const result = await db.query(`
        SELECT users.user_id, users.email, COALESCE(SUM(LENGTH(content.content)) / 1024 / 1024, 0) AS storage_used
        FROM users
        LEFT JOIN content ON users.user_id = content.user_id
        GROUP BY users.user_id, users.email
    `);
    await db.end();
    return result;
}

// Function to send marketing emails to verified users
async function sendMarketingEmails(subject, message) {
    try {
        const db = await mysql.createConnection(config);
        const users = await db.query('SELECT email FROM users WHERE is_verified = 1');
        await db.end();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'xxxxxxx',  // Replace with your Gmail email
                pass: 'xxxxxxx',     // Replace with your Gmail App Password
            },
            logger: true,  
            debug: true,  
        });

       
        for (const user of users) {
            const mailOptions = {
                from: 'xxxxxxxxxxx',  // Replace with your Gmail email
                to: user.email,  // Send to the user's email
                subject: subject,  // Subject of the email from the admin
                html: `<p>${message}</p>`,  // Admin's marketing message as HTML
            };
            const result = await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${user.email}:`, result);
        }

    } catch (error) {
        console.error('Error sending marketing emails:', error);
    }
}

function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();  
    }
    res.status(403).send("Forbidden: You do not have admin privileges");
}


function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();  
    }
    res.redirect('/login');  
}


module.exports = {
    insertContent,
    getLabelsForUser,
    getLabelById,
    updateLabel,
    deleteLabel,
    updateLabelQRCode,
    getUserByEmail,
    saveGoogleUser,
    getUserById,
    updateUserStorage,
    getAllUsers,
    toggleUserActivation,
    getStorageUsageForAllUsers,
    sendMarketingEmails,
    isAdmin,
    isAuthenticated,
};
