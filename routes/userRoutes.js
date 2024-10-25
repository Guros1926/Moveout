const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const router = express.Router();
const mysql = require("promise-mysql");
const config = require("./../config/db/moveout.json");
const passport = require("passport");
const { isAuthenticated, isAdmin } = require('./../src/moveout');
const moveout = require('./../src/moveout.js');

const saltRounds = 10;
const passwordRegex = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/;  // Enforce alphanumeric and 6+ characters

// Admin login route
router.get('/admin/login', (req, res) => {
    res.render('admin/login.ejs');  
});

router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = await mysql.createConnection(config);
        const sql = `SELECT * FROM users WHERE email = ?`;
        const result = await db.query(sql, [email]);
        await db.end();

        if (result.length === 0) {
            return res.status(400).send("Admin user not found");
        }

        const admin = result[0];

        if (admin.email !== 'admin123@example.com') {
            return res.status(403).send("Access denied");
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(400).send("Invalid credentials");
        }

        
        req.session.userId = admin.user_id;
        req.session.email = admin.email;
        req.session.isAdmin = true;

       
        console.log('Admin session set:', req.session);

        
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.redirect('/admin/login');
            }
            res.redirect('/admin/dashboard');
        });
    } catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).send("Error logging in admin");
    }
});


// Admin dashboard route
router.get('/admin/dashboard', (req, res) => {
    console.log('Session on dashboard:', req.session);
    if (!req.session.isAdmin) {
        return res.redirect('/admin/login');
    }

    res.render('admin/dashboard.ejs');
});


router.get("/admin/send-emails", isAuthenticated, isAdmin, (req, res) => {
    res.render("admin/send-emails.ejs");
});

router.post("/admin/send-emails", isAuthenticated, isAdmin, async (req, res) => {
    const { subject, message } = req.body;
    try {
        await moveout.sendMarketingEmails(subject, message);
        res.redirect("/admin/send-emails");
    } catch (err) {
        console.error("Error sending emails:", err);
        res.status(500).send("Error sending emails");
    }
});

router.get("/admin/manage-users", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await moveout.getAllUsers();  // Fetch users from eshop module
        res.render("admin/manage-users.ejs", { users });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).send("Error fetching users");
    }
});

router.post("/admin/toggle-user/:id", isAuthenticated, isAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await moveout.toggleUserActivation(userId);
        res.redirect("/admin/manage-users");
    } catch (err) {
        console.error("Error toggling user status:", err);
        res.status(500).send("Error toggling user status");
    }
});

router.get("/admin/view-storage", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const storageData = await moveout.getStorageUsageForAllUsers();
        res.render("admin/view-storage.ejs", { storageData });
    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Error fetching storage data");
    }
});

// Set up Nodemailer using App Password
async function sendVerificationEmail(email, verificationUrl) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'xxxxxxx',  // Replace with your Gmail email
                pass: 'xxxxxxx',     // Replace with your Gmail App Password
            },
            logger: true,  
            debug: true,  
        });

        const mailOptions = {
            from: 'xxxxxxx',  // Replace with your Gmail email
            to: email,
            subject: 'Verify your email address',
            html: `<p>Please verify your email by clicking the following link: <a href="${verificationUrl}">Verify Email</a></p>`,
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent:', result);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Register route
router.get("/register", (req, res) => {
    res.render("moveout/register.ejs"); 
});

router.post("/register", async (req, res) => {
    const { email, password } = req.body;

    
    if (!passwordRegex.test(password)) {
        return res.status(400).send("Password must be at least 6 characters long and contain both letters and numbers.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const db = await mysql.createConnection(config);
        const sql = `INSERT INTO users (email, password, verification_token, is_verified) VALUES (?, ?, ?, 0)`;
        await db.query(sql, [email, hashedPassword, verificationToken]);
        await db.end();

        const verificationUrl = `http://localhost:1522/verify-email?token=${verificationToken}`;

        await sendVerificationEmail(email, verificationUrl);

        res.render("moveout/register-success.ejs");  
    } catch (error) {
        console.error("Error registering user:", error);  
        res.status(500).send("Error registering user");
    }
});



// Login route (updated to check if the user is verified)
router.get("/login", (req, res) => {
    res.render("moveout/login.ejs");  
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = await mysql.createConnection(config);
        const sql = `SELECT * FROM users WHERE email = ?`;
        const result = await db.query(sql, [email]);
        await db.end();

        if (result.length === 0) {
            return res.status(400).send("User not found");
        }

        const user = result[0];

        
        if (!user.is_verified) {
            return res.status(400).send("Please verify your email before logging in.");
        }

       
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).send("Invalid credentials");
        }

       
        req.session.userId = user.user_id;
        req.session.email = user.email;
        res.redirect("/");
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Error logging in");
    }
});

// Logout route
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

router.get("/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send("Verification token is missing.");
    }

    try {
        const db = await mysql.createConnection(config);

        const sql = `SELECT * FROM users WHERE verification_token = ?`;
        const result = await db.query(sql, [token]);

        if (result.length === 0) {
            await db.end();
            return res.status(400).send("Invalid or expired verification token.");
        }

        const user = result[0];

        const updateSql = `UPDATE users SET is_verified = 1 WHERE user_id = ?`;
        await db.query(updateSql, [user.user_id]);

        const clearTokenSql = `UPDATE users SET verification_token = '' WHERE user_id = ?`;
        await db.query(clearTokenSql, [user.user_id]);

        await db.end();

        res.render("moveout/verify-email.ejs");
    } catch (error) {
        console.error("Error verifying email:", error);  
        res.status(500).send("Error verifying email.");
    }
});

// Route to trigger Google OAuth
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']  
}));

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.regenerate((err) => {
            if (err) {
                console.error('Error regenerating session:', err);
                return res.redirect('/login');
            }

            req.session.userId = req.user.user_id;
            req.session.email = req.user.email;

            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.redirect('/login');
                }
                res.redirect('/');
            });
        });
    }
);


module.exports = router;
