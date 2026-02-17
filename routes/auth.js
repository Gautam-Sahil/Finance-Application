const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// 🟢 CONFIGURE GOOGLE STRATEGY
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? "https://finance-app-backend.onrender.com/api/auth/google/callback"
      : "http://localhost:3000/api/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
        const User = mongoose.model('User');
        
        // 1. Check if user exists by Email
        let user = await User.findOne({ emailId: profile.emails[0].value });

        if (user) {
            // User exists? Great. Update provider if needed.
            if (user.authProvider !== 'google') {
                user.authProvider = 'google'; // Link account
                await user.save();
            }
            return cb(null, user);
        } else {
            // 2. User doesn't exist? CREATE NEW.
            const newUser = new User({
                // Generate username: "GautamTiwari" + random number
                username: profile.displayName.replace(/\s+/g, '') + Math.floor(Math.random() * 1000), 
                emailId: profile.emails[0].value,
                fullName: profile.displayName,
                password: '', // No password for Google users
                role: 'Customer', // Default role
                isVerified: true, // Google emails are verified
                authProvider: 'google' // 🟢 MARK AS GOOGLE USER
            });
            await newUser.save();
            return cb(null, newUser);
        }
    } catch (err) {
        return cb(err, null);
    }
  }
));

// Serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// 🟢 Configure Email Sender (Use Ethereal for testing, or Gmail App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail
        pass: process.env.EMAIL_PASS  // Your App Password
    }
});

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. REGISTER (Create inactive user & send OTP)
// 1. REGISTER
// 1. REGISTER (Smart Logic: Overwrite unverified users)
router.post('/register', async (req, res) => {
    try {
        const { username, emailId, fullName, password, role } = req.body;
        const User = mongoose.model('User');

        // 🟢 STEP 1: Check if Email or Username already exists
        const existingUser = await User.findOne({ $or: [{ emailId }, { username }] });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                // 🔴 Case A: Real, verified user exists. Stop them.
                if (existingUser.emailId === emailId) {
                    return res.status(400).json({ message: 'User with this email already exists' });
                } else {
                    return res.status(400).json({ message: 'Username already taken' });
                }
            } else {
                // 🟡 Case B: Found an "Unverified" user (stale data). 
                // DELETE IT so the user can try again!
                await User.deleteOne({ _id: existingUser._id });
                console.log(`🗑️ Deleted stale unverified user: ${existingUser.emailId}`);
            }
        }

        // 🟢 STEP 2: Proceed with New Registration (Fresh Start)
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();

        const newUser = new User({
            username, 
            emailId, 
            fullName, 
            role,
            password: hashedPassword,
            otp: otp,
            otpExpires: Date.now() + 10 * 60 * 1000, 
            isVerified: false, // Inactive until verify-otp is called
            authProvider: 'local'
        });

        await newUser.save();

        // 🟢 STEP 3: Send Email (Beautiful UI)
        try {
            await transporter.sendMail({
                from: '"Finance App" <no-reply@financeapp.com>',
                to: emailId,
                subject: 'Verify Your Finance App Account',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e2e2; border-radius: 15px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #229b73; margin: 0; font-size: 28px;">Finance App</h1>
                  </div>
                  <h3 style="color: #333333; font-size: 20px;">Welcome, ${fullName}!</h3>
                  <p style="font-size: 16px; color: #555555; line-height: 1.5;">
                    Thank you for registering with <strong>Finance App</strong>. Please verify your email address using the code below:
                  </p>
                  <div style="text-align: center; margin: 40px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #37d59e; padding: 15px 30px; background-color: #f4fbf8; border: 2px dashed #37d59e; border-radius: 10px; display: inline-block;">${otp}</span>
                  </div>
                  <p style="font-size: 14px; color: #888888; text-align: center;">
                    ⏳ Valid for 10 minutes.
                  </p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #aaaaaa; text-align: center; margin: 0;">
                    Automated message from Finance App.
                  </p>
                </div>
                `
            });
            console.log(` OTP sent to ${emailId}: ${otp}`);
        } catch (emailError) {
            console.error(" Email Failed:", emailError.message);
            // Don't fail the request, just log it. 
            // In dev, you can see the OTP in the console below.
        }

        res.status(201).json({ message: 'OTP sent! Check your email.' });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});
// 2. VERIFY OTP (Activate account)
// routes/auth.js - Replace the existing verify-otp route with this:

router.post('/verify-otp', async (req, res) => {
    try {
        const { emailId, otp } = req.body;
        

        const User = mongoose.model('User');
        
        // 1. Find User (Case Insensitive Email)
        const user = await User.findOne({ emailId: { $regex: new RegExp(`^${emailId}$`, 'i') } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Check Expiry
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired. Please register again.' });
        }
        
        // 3. SECURE CHECK: Convert both to Strings and Trim Spaces
        const inputOtp = String(otp).trim();
        const dbOtp = String(user.otp).trim();

        if (inputOtp !== dbOtp) {
            return res.status(400).json({ message: 'Invalid OTP. Please check your email again.' });
        }

        // 4. Success
        console.log(" Success! Activating user.");
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified! You can now login.' });

    } catch (err) {
        console.error(" Server Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});
// 3. LOGIN (Check verification status)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const User = mongoose.model('User');
        const user = await User.findOne({ username });

        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // 🔴 Prevent login if not verified
        if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({ token, user: { id: user._id, fullName: user.fullName, role: user.role, email: user.emailId } });

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 4. FORGOT PASSWORD (Send OTP)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const User = mongoose.model('User');
        const user = await User.findOne({ emailId: email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

      // 🔴 SEND EMAIL (Beautiful UI for Password Reset)
        await transporter.sendMail({
            from: '"Finance App" <no-reply@financeapp.com>', // 🟢 Updated Name
            to: email,
            subject: 'Password Reset Request - Finance App',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e2e2; border-radius: 15px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #229b73; margin: 0; font-size: 28px;">Finance App</h1>
              </div>
              <h3 style="color: #333333; font-size: 20px;">Password Reset Request</h3>
              <p style="font-size: 16px; color: #555555; line-height: 1.5;">
                Hello, <br><br>
                We received a request to reset the password for your <strong>Finance App</strong> account associated with this email. Please use the One-Time Password (OTP) below to set up a new password:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d9534f; padding: 15px 30px; background-color: #fdf3f2; border: 2px dashed #d9534f; border-radius: 10px; display: inline-block;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #888888; text-align: center;">
                ⏳ This code is valid for <strong>10 minutes</strong>. <br>
                If you did not request a password reset, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
              <p style="font-size: 12px; color: #aaaaaa; text-align: center; margin: 0;">
                This is an automated message from Finance App. Please do not reply to this email.
              </p>
            </div>
            `
        });

        res.json({ message: 'OTP sent to email.' });

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 5. RESET PASSWORD (Verify & Change)
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const User = mongoose.model('User');
        const user = await User.findOne({ emailId: email });

        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or Expired OTP' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. Please login.' });

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 1. Start Login
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Callback (Redirect to Frontend)
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;
    
    // Generate Token
    const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '1d' }
    );

    // Prepare User Data for Frontend
    const userJson = JSON.stringify({
        _id: user._id,
        fullName: user.fullName,
        emailId: user.emailId,
        role: user.role,
        username: user.username, // Send the generated username
        authProvider: user.authProvider || 'local' // Send provider info
    });

   const frontendUrl = process.env.NODE_ENV === 'production'
      ? "https://finance-app.vercel.app"
      : "http://localhost:4200";

    res.redirect(`${frontendUrl}/login?token=${token}&user=${encodeURIComponent(userJson)}`);
  }
);

module.exports = router;