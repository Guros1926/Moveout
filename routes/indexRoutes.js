const express = require("express");
const router = express.Router();
const eshop = require("../src/moveout.js");
const QRCode = require("qrcode");  // QRCode library
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const passport = require("passport");

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Home route
router.get("/", (req, res) => {
    res.render("moveout/home.ejs");
});

// Render the 'Create Label' form
router.get("/createlabel", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    res.render("moveout/createlabel.ejs");
});

// Function to generate a QR code and save it
async function generateQRCode(labelId) {
    const qrCodePath = path.join(__dirname, "..", "public", "uploads", `qrcode_label_${labelId}.png`);
    const qrCodeUrl = `http://localhost:1522/viewlabel/${labelId}`;  // Ensure the labelId is passed correctly

    // Generate the QR code and save it as an image file
    await QRCode.toFile(qrCodePath, qrCodeUrl, {
        color: {
            dark: '#000000',  // QR code color
            light: '#ffffff'  // Background color
        }
    });

    // Return the relative path to the QR code image
    return `/uploads/qrcode_label_${labelId}.png`;
}

router.post("/addlabel", async (req, res) => {
    try {
        const { title, content_type, content, icons, is_private, pin } = req.body;
        const userId = req.session.userId;

        let newContent;

        // Handle file upload for images, videos, or audio
        if (content_type === 'image' || content_type === 'video' || content_type === 'audio') {
            if (req.files && req.files.file) {
                let uploadedFile = req.files.file;
                let uploadPath = path.join(__dirname, "..", "public", "uploads", uploadedFile.name);
                await uploadedFile.mv(uploadPath);
                newContent = `/uploads/${uploadedFile.name}`;
            } else {
                return res.status(400).send('No file uploaded');
            }
        } else {
            newContent = content;
        }

        const iconString = Array.isArray(icons) ? icons.join(',') : icons || '';

        const labelId = await eshop.insertContent({
            title,
            content_type,
            content: newContent,
            icons: iconString,
            user_id: userId,
            qr_code: '',
            is_private: is_private === '1',
            pin: is_private === '1' ? pin : null
        });

        const qrCodePath = await generateQRCode(labelId);
        await eshop.updateLabelQRCode(labelId, qrCodePath);

        res.redirect("/mylabels");
    } catch (err) {
        console.error("Error adding label:", err);
        res.status(500).send("Error adding label");
    }
});



// Route to display user's saved labels
router.get("/mylabels", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    try {
        const userId = req.session.userId;  // Get the logged-in user's ID
        const data = {
            title: "My Labels",
            labels: await eshop.getLabelsForUser(userId)  // Get labels for the current user
        };
        res.render("moveout/mylabels.ejs", data);
    } catch (err) {
        console.error("Error fetching labels:", err);
        res.status(500).send("Error fetching labels");
    }
});


// Route to render the edit label form
router.get("/editlabel/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const labelId = req.params.id;

    try {
        const label = await eshop.getLabelById(labelId);  // Fetch label by ID
        if (!label) {
            return res.status(404).send("Label not found.");
        }
        res.render("moveout/editlabel.ejs", { label });
    } catch (err) {
        console.error("Error fetching label:", err);
        res.status(500).send("Error fetching label");
    }
});

// Route to handle label editing
router.post("/editlabel/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const labelId = req.params.id;
    const { title, content_type, content, icons, existing_file } = req.body;

    try {
        let newContent;

        // Check if a new file is uploaded
        if (content_type === "image" || content_type === "video" || content_type === "audio") {
            if (req.files && req.files.file) {
                
                let uploadedFile = req.files.file;
                let uploadPath = `./public/uploads/${uploadedFile.name}`;
                await uploadedFile.mv(uploadPath);
                newContent = `/uploads/${uploadedFile.name}`;  
            } else {
                // No new file uploaded, keep the existing one
                newContent = existing_file;
            }
        } else {
            // For text content, just use the submitted content
            newContent = content;
        }

        // Update the label with title, content, and icons
        await eshop.updateLabel(labelId, {
            title,
            content_type,
            content: newContent,
            icons: Array.isArray(icons) ? icons.join(',') : icons || ''
        });

        res.redirect("/mylabels");
    } catch (err) {
        console.error("Error updating label:", err);
        res.status(500).send("Error updating label");
    }
});

// Route to handle label deletion (use POST instead of GET)
router.post("/deletelabel/:id", async (req, res) => {
    const labelId = req.params.id;

    try {
        await eshop.deleteLabel(labelId);
        res.redirect("/mylabels");  
    } catch (err) {
        console.error("Error deleting label:", err);
        res.status(500).send("Error deleting label");
    }
});

// Route to view a specific label by its ID
router.get("/viewlabel/:id", async (req, res) => {
    const labelId = req.params.id;

    try {
        const label = await eshop.getLabelById(labelId);  // Fetch label by ID
        if (!label) {
            return res.status(404).send("Label not found.");
        }

        // If the label is private, prompt for the PIN
        if (label.is_private) {
            return res.render("moveout/enter_pin.ejs", { labelId, error: null });  // Pass error as null initially
        }

        res.render("moveout/viewlabel.ejs", { label });
    } catch (err) {
        console.error("Error fetching label:", err);
        res.status(500).send("Error fetching label");
    }
});

// Route to handle PIN verification
router.post("/viewlabel/:id", async (req, res) => {
    const labelId = req.params.id;
    const { pin } = req.body;

    try {
        const label = await eshop.getLabelById(labelId); 
        if (!label) {
            return res.status(404).send("Label not found.");
        }

        
        const isMatch = await bcrypt.compare(pin, label.pin_hash);
        if (!isMatch) {
            return res.render("moveout/enter_pin.ejs", { labelId, error: "Invalid PIN. Please try again." });
        }

       
        res.render("moveout/viewlabel.ejs", { label });
    } catch (err) {
        console.error("Error verifying PIN:", err);
        res.status(500).send("Error verifying PIN");
    }
});


module.exports = router;
