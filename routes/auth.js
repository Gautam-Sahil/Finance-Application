const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const resend = new Resend(process.env.RESEND_API_KEY);

// 🟢 CONFIGURE GOOGLE STRATEGY
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? "https://finance-app-backend-14qy.onrender.com/api/auth/google/callback"
      : "http://localhost:3000/api/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
        const User = mongoose.model('User');
        let user = await User.findOne({ emailId: profile.emails[0].value });

        if (user) {
            if (user.authProvider !== 'google') {
                user.authProvider = 'google';
                await user.save();
            }
            return cb(null, user);
        } else {
            const newUser = new User({
                username: profile.displayName.replace(/\s+/g, '') + Math.floor(Math.random() * 1000), 
                emailId: profile.emails[0].value,
                fullName: profile.displayName,
                password: '',
                role: 'Customer',
                isVerified: true,
                authProvider: 'google'
            });
            await newUser.save();
            return cb(null, newUser);
        }
    } catch (err) {
        return cb(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ------------------ REGISTER ------------------
router.post('/register', async (req, res) => {
    try {
        const { username, emailId, fullName, password, role } = req.body;
        const User = mongoose.model('User');

        const existingUser = await User.findOne({ $or: [{ emailId }, { username }] });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                if (existingUser.emailId === emailId) {
                    return res.status(400).json({ message: 'User with this email already exists' });
                } else {
                    return res.status(400).json({ message: 'Username already taken' });
                }
            } else {
                await User.deleteOne({ _id: existingUser._id });
                console.log(`🗑️ Deleted stale unverified user: ${existingUser.emailId}`);
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();

        const newUser = new User({
            username, 
            emailId, 
            fullName, 
            role,
            password: hashedPassword,
            otp,
            otpExpires: Date.now() + 10 * 60 * 1000, 
            isVerified: false,
            authProvider: 'local'
        });

        await newUser.save();

        // ------------------ SEND EMAIL via Resend ------------------
        try {
            await resend.emails.send({
                from: 'Finance App <no-reply@financeapp.com>',
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
            console.log(`OTP sent to ${emailId}: ${otp}`);
        } catch (emailError) {
            console.error("Email Failed:", emailError.message);
        }

        res.status(201).json({ message: 'OTP sent! Check your email.' });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ------------------ VERIFY OTP ------------------
router.post('/verify-otp', async (req, res) => {
    try {
        const { emailId, otp } = req.body;
        const User = mongoose.model('User');
        const user = await User.findOne({ emailId: { $regex: new RegExp(`^${emailId}$`, 'i') } });

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.otpExpires < Date.now()) return res.status(400).json({ message: 'OTP has expired. Please register again.' });

        if (String(user.otp).trim() !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP. Please check your email again.' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified! You can now login.' });

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ------------------ LOGIN ------------------
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const User = mongoose.model('User');
        const user = await User.findOne({ username });

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({ token, user: { id: user._id, fullName: user.fullName, role: user.role, email: user.emailId } });

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ------------------ FORGOT PASSWORD ------------------
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

        await resend.emails.send({
            from: 'Finance App <no-reply@financeapp.com>',
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

// ------------------ RESET PASSWORD ------------------
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

// ------------------ GOOGLE OAUTH ------------------
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    const userJson = JSON.stringify({
        _id: user._id,
        fullName: user.fullName,
        emailId: user.emailId,
        role: user.role,
        username: user.username,
        authProvider: user.authProvider || 'local'
    });

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? "https://finance-application-teal.vercel.app"
      : "http://localhost:4200";

    res.redirect(`${frontendUrl}/login?token=${token}&user=${encodeURIComponent(userJson)}`);
  }
);

module.exports = router;
