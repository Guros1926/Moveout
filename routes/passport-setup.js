const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const moveout = require("./../src/moveout.js");

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user);
    done(null, user.user_id);  
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user with ID:', id);
        const user = await moveout.getUserById(id); 
        console.log('User found during deserialization:', user);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,  
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:1522/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        
        const existingUser = await moveout.getUserByEmail(profile.emails[0].value);
        
        if (existingUser) {
            console.log('Existing user found, logging in:', existingUser);  
            return done(null, existingUser);
        }
        
        // Create new user if they don't exist
        const newUser = {
            email: profile.emails[0].value,
            googleId: profile.id,
            name: profile.displayName
        };
        
        const savedUser = await moveout.saveGoogleUser(newUser);
        console.log('New user saved:', savedUser);  
        done(null, savedUser);
    } catch (error) {
        console.error('Error in Google OAuth callback:', error); 
        done(error, null);
    }
}));
