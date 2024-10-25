require('dotenv').config();
const passport = require('passport');
const express = require("express");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const indexRoutes = require("./routes/indexRoutes.js");
const userRoutes = require("./routes/userRoutes.js");

const app = express();
const port = 1522;

app.use(express.static("public"));

app.use(fileUpload({
    createParentPath: true
}));

// Setup session before initializing Passport
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false, 
    cookie: {
        secure: false,  
        httpOnly: true,  
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Initialize Passport.js middleware
app.use(passport.initialize());
app.use(passport.session());

// Make user and session available in views
app.use((req, res, next) => {
    res.locals.user = req.user;  
    res.locals.session = req.session;
    next();
});



app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Use the routes
app.use(indexRoutes);
app.use(userRoutes);  

// Start server
app.listen(port, () => {
    console.log(`Server is listening on port: ${port}`);
});
