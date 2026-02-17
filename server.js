
const chatbotRoutes = require('./chatbot');
require('dotenv').config();

const passport = require('passport'); // 🟢 NEW
const session = require('express-session'); // 🟢 NEW

const express = require('express');
const app = express();   // ✅ CREATE APP FIRST

const http = require('http');
const server = http.createServer(app);  // ✅ THEN SERVER

const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');

const io = socketIo(server, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store online users (socket.id -> userId)
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Authenticate user and join room
    socket.on('authenticate', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.join(userId); // join private room
        console.log(`User ${userId} is online`);
    });

    socket.on('disconnect', () => {
        // Remove user from map
        for (let [userId, sockId] of onlineUsers.entries()) {
            if (sockId === socket.id) {
                onlineUsers.delete(userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

// Helper to emit to a specific user
function sendNotification(userId, notification) {
    io.to(userId).emit('notification', notification);
}


app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: 'your_session_secret_key', 
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection failed:", err));

// ==================== SCHEMAS ====================

// User Schema
// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    emailId: { type: String, required: true },
    fullName: { type: String, required: true },
    
    // 🟢 Password is NOT required for Google users
    password: { type: String }, 
    
    role: { type: String, default: 'Customer' },
    projectName: { type: String, default: 'LoanApp_v19' },
    docPath: { type: String, default: '' },
    
    // 🟢 Auth Provider (local vs google)
    authProvider: { type: String, default: 'local' },

    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


const User = mongoose.model('User', userSchema);

// Loan Detail Schema
const loanDetailSchema = new mongoose.Schema({
    bankName: String,
    loanAmount: Number,
    emi: Number
});

// Loan Application Schema
const loanApplicationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who submitted
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    dateOfBirth: Date,
    panCard: { type: String, required: true },
    salary: Number,
    employmentStatus: String,
    applicationStatus: { type: String, default: 'pending' },
    creditScore: Number,
    assets: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    loans: [loanDetailSchema],
    docPath: { type: String, default: '' },
      documents: [{
        fileName: String,
        filePath: String,
        uploadedAt: { type: Date, default: Date.now },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
        isVerified: { type: Boolean, default: false }
    }],
    
    // 🔹 Review history (for approval workflow)
    reviewHistory: [{
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: String,        // 'submitted', 'doc_verified', 'approved', 'rejected', 'revision_requested'
        comment: String,
        date: { type: Date, default: Date.now }
    }],
    
    // 🔹 New fields for workflow
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // optional: officer assigned
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalRemarks: String,
    rejectionReason: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
     requestedAmount: Number,               // loan amount they applied for
    approvedAmount: Number,                // actual amount approved (could be same)
    interestRate: Number,                  // annual interest rate (e.g., 10.5)
    tenureMonths: Number,                  // loan tenure in months
    emi: Number,                           // calculated monthly EMI
    disbursedDate: Date,                    // when loan was disbursed
    nextDueDate: Date,                      // next EMI due date
    outstandingBalance: Number,              // remaining principal
    totalPaid: Number,                       // total amount paid so far
    status: { type: String, default: 'active' } // active, closed, defaulted
});

const LoanApplication = mongoose.model('LoanApplication', loanApplicationSchema);

const repaymentSchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanApplication', required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    principalPaid: Number,
    interestPaid: Number,
    paidDate: Date,                         // when actually paid
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    transactionId: String,                   // reference if any
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who recorded payment
    createdAt: { type: Date, default: Date.now }
});

const Repayment = mongoose.model('Repayment', repaymentSchema);


// ==================== NOTIFICATION SCHEMA ====================
const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },              // e.g. '/loan-application-list?id=...'
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);


// ==================== SUPPORT TICKET SCHEMA ====================
// ==================== SUPPORT TICKET SCHEMA ====================
const supportTicketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    replies: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true }); // ✅ This automatically adds createdAt and updatedAt

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

// ==================== AUDIT LOG SCHEMA ====================
const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who performed action
    action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
    collectionName: { type: String, required: true }, // 'User' or 'LoanApplication'
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true }, // the affected document
    changes: { type: mongoose.Schema.Types.Mixed }, // store old/new values (for updates)
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);


// ==================== MULTER FILE UPLOAD ====================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `loan-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// ==================== JWT AUTH MIDDLEWARE ====================

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
}

// Audit log middleware for User
userSchema.post('save', function(doc) {
    // Only log if this is a new user (not update)
    if (doc.isNew) {
        const log = new AuditLog({
            userId: doc._id, // user themselves created? For registration, we don't have req.user. We'll handle specially.
            action: 'CREATE',
            collectionName: 'User',
            documentId: doc._id,
            changes: { fullName: doc.fullName, emailId: doc.emailId, role: doc.role }
        });
        log.save().catch(err => console.error('Audit log error:', err));
    }
});

// For updates


loanApplicationSchema.post('save', function(doc) {
    if (doc.isNew) {
        const log = new AuditLog({
            userId: doc.userId, // we'll store userId on loan
            action: 'CREATE',
            collectionName: 'LoanApplication',
            documentId: doc._id,
            changes: { fullName: doc.fullName, amount: doc.salary, status: doc.applicationStatus }
        });
        log.save().catch(err => console.error('Audit log error:', err));
    }
});


// ==================== USER ROUTES ====================



// Register
app.use('/api', require('./routes/auth'));
// ==================== DASHBOARD STATS (ENHANCED) ====================

// Get customer dashboard stats
app.get('/api/dashboard/customer', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'Customer') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get customer's loans (approved/disbursed)
        const loans = await LoanApplication.find({
            userId: req.user.id,
            applicationStatus: { $in: ['approved', 'disbursed'] }
        }).select('approvedAmount emi outstandingBalance nextDueDate status fullName');

        const totalLoans = loans.length;
        const totalOutstanding = loans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);
        const totalApproved = loans.reduce((sum, l) => sum + (l.approvedAmount || 0), 0);
        const totalPaid = totalApproved - totalOutstanding;

        // Get upcoming repayments for these loans (next 5)
        const upcoming = await Repayment.find({
            loanId: { $in: loans.map(l => l._id) },
            status: 'pending',
            dueDate: { $gte: new Date() }
        })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('loanId', 'fullName');

        // Recent activity (last 5 review history events + repayments)
        const recentActivity = [];

        // Add repayments as activity
        const recentRepayments = await Repayment.find({
            loanId: { $in: loans.map(l => l._id) },
            status: 'paid',
            paidDate: { $exists: true }
        })
        .sort({ paidDate: -1 })
        .limit(5)
        .populate('loanId', 'fullName');

        recentRepayments.forEach(r => {
            recentActivity.push({
                id: r._id,
                title: `EMI paid for ${r.loanId.fullName}`,
                status: 'paid',
                date: r.paidDate
            });
        });

        // Add application reviews
        const reviews = await LoanApplication.find({
            userId: req.user.id,
            'reviewHistory.0': { $exists: true }
        })
        .sort({ 'reviewHistory.date': -1 })
        .limit(5)
        .select('reviewHistory fullName');

        reviews.forEach(app => {
            app.reviewHistory.forEach(r => {
                recentActivity.push({
                    id: r._id,
                    title: `${r.action} for ${app.fullName}`,
                    status: r.action,
                    date: r.date
                });
            });
        });

        // Sort all activity by date desc and take 5
        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recent = recentActivity.slice(0, 5);

        // Payment history for chart (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        const paymentHistory = await Repayment.aggregate([
            {
                $match: {
                    loanId: { $in: loans.map(l => l._id) },
                    paidDate: { $gte: sixMonthsAgo },
                    status: 'paid'
                }
            },
            {
                $group: {
                    _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            totalLoans,
            totalOutstanding,
            totalApproved,
            totalPaid,
            nextEmi: loans.filter(l => l.nextDueDate).sort((a, b) => a.nextDueDate - b.nextDueDate)[0] || null,
            loans: loans.map(l => ({
                _id: l._id,
                name: l.fullName,
                approvedAmount: l.approvedAmount,
                emi: l.emi,
                outstanding: l.outstandingBalance,
                nextDue: l.nextDueDate,
                progress: ((l.approvedAmount - l.outstandingBalance) / l.approvedAmount * 100) || 0
            })),
            upcoming,
            recentActivity: recent,
            paymentHistory
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get banker/admin dashboard stats
app.get('/api/dashboard/banker', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Count by status
        const statusCounts = await LoanApplication.aggregate([
            { $group: { _id: '$applicationStatus', count: { $sum: 1 } } }
        ]);

        // Monthly applications trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        const monthlyTrend = await LoanApplication.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 }
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Total approved amount
        const totalApproved = await LoanApplication.aggregate([
            { $match: { applicationStatus: 'approved' } },
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
        ]);

        // Recent applications (last 5)
        const recent = await LoanApplication.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'fullName')
            .select('fullName applicationStatus createdAt');

        // Repayment summary (for charts)
        const repaymentSummary = await Repayment.aggregate([
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                total: { $sum: '$amount' }
            }}
        ]);

        // Loan type distribution (if you have loan types)
        // For simplicity, we'll use loans array length as a placeholder.

        res.json({
            statusCounts,
            monthlyTrend,
            totalApproved: totalApproved[0]?.total || 0,
            recent,
            repaymentSummary
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user with role checks
app.put('/api/users/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        const requestingUser = req.user;

        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) return res.status(404).json({ message: "User not found" });

        // Permissions
        if (!['Admin', 'Banker'].includes(requestingUser.role)) {
            return res.status(403).json({ message: "Insufficient permissions." });
        }
        if (requestingUser.role === 'Banker') {
            if (userToUpdate.role !== 'Customer') return res.status(403).json({ message: "Bankers can only update customers" });
            if (updates.role && ['Admin', 'Banker'].includes(updates.role)) return res.status(403).json({ message: "Bankers cannot change role to Admin or Banker" });
        }
        if (requestingUser.role === 'Admin' && userId === requestingUser.id) {
            if (updates.role && updates.role !== 'Admin') return res.status(403).json({ message: "Cannot change your own role" });
        }

        // Prevent password update here
        if (updates.password) delete updates.password;

        // Prevent duplicate username
        if (updates.username && updates.username !== userToUpdate.username) {
            const existing = await User.findOne({ username: updates.username });
            if (existing) return res.status(409).json({ message: "Username already taken" });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true }).select('-password');
        res.json({ message: "User updated successfully", user: updatedUser });

        // after updating
await createAuditLog(
    req.user.id,   // the banker/admin doing the update
    'UPDATE',
    'User',
    updatedUser._id,
    updates   // the changes sent
);

    } catch (error) {
        res.status(500).json({ message: "Update failed", error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
        await createAuditLog(
    req.user.id,
    'DELETE',
    'User',
    deletedUser._id,
    { fullName: deletedUser.fullName, emailId: deletedUser.emailId }
);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get unread count & notifications for current user
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark a notification as read
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Not found' });
        if (notification.recipient.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });
        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Helper function to create and emit notification
async function createNotification(userId, title, message, link = '') {
    try {
        const notification = new Notification({
            recipient: userId,
            title,
            message,
            link
        });
        await notification.save();
        // Emit real-time if user is online
        sendNotification(userId, {
            _id: notification._id,
            title,
            message,
            link,
            isRead: false,
            createdAt: notification.createdAt
        });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

// Helper to create audit log
async function createAuditLog(userId, action, collectionName, documentId, changes) {
    try {
        const log = new AuditLog({
            userId,
            action,
            collectionName,
            documentId,
            changes
        });
        await log.save();
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// ==================== LOAN ROUTES ====================

// Save loan application
app.post('/api/save-loan', authMiddleware, async (req, res) => {
    try {
        const newApplication = new LoanApplication({
            ...req.body,
            userId: req.user.id   // ✅ FIXED
        });

        await newApplication.save();

        // Notify all Bankers and Admins
        const bankersAndAdmins = await User.find({
            role: { $in: ['Banker', 'Admin'] }
        });

        for (const user of bankersAndAdmins) {
            await createNotification(
                user._id,
                'New Loan Application',
                `${req.body.fullName} submitted a loan application`,
                `/loan-application-list?id=${newApplication._id}`
            );
        }

        res.status(201).json({
            message: "Application submitted successfully!",
            data: newApplication
        });

    } catch (error) {
        res.status(400).json({
            message: "Error saving application",
            error: error.message
        });
    }
});




// Get all loans with pagination, search, filter
app.get('/api/get-loans', async (req, res) => {
    try {
        let { page = 1, limit = 5, search = '', status = '' } = req.query;
        const filter = { fullName: { $regex: search, $options: 'i' } };
        if (status) filter.applicationStatus = status;

        const totalItems = await LoanApplication.countDocuments(filter);
        const loans = await LoanApplication.find(filter)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 });

        res.json({
            loans,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: Number(page)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single loan
app.get('/api/get-loan/:id', async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id)
      .populate('reviewHistory.reviewer', 'fullName username role');
    if (!application) return res.status(404).json({ message: "Not found" });
    res.json(application);
  } catch (error) {
    res.status(404).json({ message: "Not found" });
  }
});
// ==================== DOCUMENT VERIFICATION ====================
// Upload document (extend existing upload)
app.post('/api/upload-doc/:id', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const loan = await LoanApplication.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: "Application not found" });

        const newDoc = {
            fileName: req.file.originalname,
            filePath: req.file.path,
            uploadedAt: new Date(),
            isVerified: false
        };

        loan.documents.push(newDoc);
        await loan.save();

        // Also keep backward compatibility: set docPath to latest document
        loan.docPath = req.file.path;
        await loan.save();

        res.json({ message: "Document uploaded", doc: newDoc });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify a document (Banker/Admin only)
app.put('/api/verify-doc/:loanId/:docIndex', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const loan = await LoanApplication.findById(req.params.loanId).populate('userId');
        if (!loan) return res.status(404).json({ message: "Loan not found" });

        const docIndex = parseInt(req.params.docIndex);

        if (docIndex >= loan.documents.length) {
            return res.status(404).json({ message: "Document not found" });
        }

        loan.documents[docIndex].isVerified = true;
        loan.documents[docIndex].verifiedBy = req.user.id;
        loan.documents[docIndex].verifiedAt = new Date();

        // Review history entry
        loan.reviewHistory.push({
            reviewer: req.user.id,
            action: 'doc_verified',
            comment: 'Document verified',
            date: new Date()
        });

        await loan.save();

        // Notify customer
        if (loan.userId) {
            await createNotification(
                loan.userId._id,
                'Document Verified',
                `Your document "${loan.documents[docIndex].fileName}" has been verified`,
                `/loan-application-list?id=${loan._id}`
            );
        }

        res.json({ message: "Document verified", document: loan.documents[docIndex] });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ==================== APPROVAL WORKFLOW ====================
// Approve application
app.put('/api/approve-loan/:id', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { remarks, approvedAmount, interestRate, tenureMonths } = req.body;

        const loan = await LoanApplication.findById(req.params.id).populate('userId');
        if (!loan) return res.status(404).json({ message: "Not found" });

        // Set loan terms if provided
        if (approvedAmount) loan.approvedAmount = approvedAmount;
        if (interestRate) loan.interestRate = interestRate;
        if (tenureMonths) loan.tenureMonths = tenureMonths;

        loan.applicationStatus = 'approved';
        loan.reviewedBy = req.user.id;
        loan.reviewedAt = new Date();
        loan.approvalRemarks = remarks || 'Approved';

        loan.reviewHistory.push({
            reviewer: req.user.id,
            action: 'approved',
            comment: remarks || 'Approved',
            date: new Date()
        });

        await loan.save();

        // Notify customer
        if (loan.userId) {
            await createNotification(
                loan.userId._id,
                'Application Approved',
                `Your loan application has been approved.`,
                `/loan-application-list?id=${loan._id}`
            );
        }

        res.json({ message: "Application approved", application: loan });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reject application
app.put('/api/reject-loan/:id', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const loan = await LoanApplication.findById(req.params.id).populate('userId');
        if (!loan) return res.status(404).json({ message: "Not found" });

        loan.applicationStatus = 'rejected';
        loan.reviewedBy = req.user.id;
        loan.reviewedAt = new Date();
        loan.rejectionReason = req.body.reason || 'Rejected';

        loan.reviewHistory.push({
            reviewer: req.user.id,
            action: 'rejected',
            comment: req.body.reason || 'Rejected',
            date: new Date()
        });

        await loan.save();
        await createAuditLog(
    req.user.id,
    'UPDATE',  // or could be 'APPROVE' if you add a custom action
    'LoanApplication',
    loan._id,
    { applicationStatus: loan.applicationStatus, remarks: req.body.remarks || req.body.reason }
);

        // Notify customer
        if (loan.userId) {
            await createNotification(
                loan.userId._id,
                'Application Rejected',
                `Your loan application was rejected.`,
                `/loan-application-list?id=${loan._id}`
            );
        }

        res.json({ message: "Application rejected", application: loan });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get review history
app.get('/api/review-history/:id', async (req, res) => {
  try {
    const loan = await LoanApplication.findById(req.params.id)
      .populate('reviewHistory.reviewer', 'fullName username role');
    if (!loan) return res.status(404).json({ message: "Not found" });
    res.json(loan.reviewHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update loan
app.put('/api/update-loan/:id', authMiddleware, async (req, res) => {
    try {
        const updatedData = await LoanApplication.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        if (!updatedData) return res.status(404).json({ message: "Application not found" });

        // 📝 AUDIT LOG – who performed the update
        await createAuditLog(
            req.user.id,                      // the banker/admin (or customer if they own it)
            'UPDATE',
            'LoanApplication',
            updatedData._id,
            req.body                           // changes made
        );

        res.json({ message: "Updated successfully", data: updatedData });
    } catch (error) {
        res.status(400).json({ message: "Update error", error: error.message });
    }
});
// Delete loan
app.delete('/api/delete-loan/:id', authMiddleware, async (req, res) => {
    try {
        const result = await LoanApplication.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: "Application not found" });

        // 📝 AUDIT LOG
        await createAuditLog(
            req.user.id,
            'DELETE',
            'LoanApplication',
            result._id,
            { fullName: result.fullName, status: result.applicationStatus }
        );

        res.json({ message: "Successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ==================== REPAYMENT ROUTES ====================

// Get all loans with repayment info (for banker/admin) – simplified list
app.get('/api/repayments/loans', authMiddleware, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'Customer') {
            filter.userId = req.user.id;
        } else {
            // bankers/admins see all approved/disbursed loans
            filter.applicationStatus = { $in: ['approved', 'disbursed'] };
        }
        const loans = await LoanApplication.find(filter)
            .select('fullName approvedAmount emi nextDueDate outstandingBalance status disbursedDate userId')
            .populate('userId', 'fullName email');
        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get repayment schedule for a specific loan
app.get('/api/repayments/loan/:loanId', authMiddleware, async (req, res) => {
    try {
        const loan = await LoanApplication.findById(req.params.loanId);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        // Check permission
        if (req.user.role === 'Customer' && loan.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get repayments for this loan
        const repayments = await Repayment.find({ loanId: req.params.loanId }).sort({ dueDate: 1 });
        res.json({ loan, repayments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generate repayment schedule (when loan is approved/disbursed)
app.post('/api/repayments/generate/:loanId', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { approvedAmount, interestRate, tenureMonths, disbursedDate } = req.body;

        const loan = await LoanApplication.findById(req.params.loanId);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        // Allow updating loan terms via this request
        if (approvedAmount) loan.approvedAmount = approvedAmount;
        if (interestRate) loan.interestRate = interestRate;
        if (tenureMonths) loan.tenureMonths = tenureMonths;
        if (disbursedDate) loan.disbursedDate = new Date(disbursedDate);

        // After potential updates, check if all required fields are present
        if (!loan.approvedAmount || !loan.interestRate || !loan.tenureMonths) {
            return res.status(400).json({ 
                message: 'Loan terms not set. Please provide approvedAmount, interestRate, and tenureMonths.' 
            });
        }

        // Delete any existing schedule for this loan
        await Repayment.deleteMany({ loanId: req.params.loanId });

        const principal = loan.approvedAmount;
        const annualRate = loan.interestRate;
        const monthlyRate = annualRate / (12 * 100);
        const tenure = loan.tenureMonths;
        const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
                    (Math.pow(1 + monthlyRate, tenure) - 1);

        let balance = principal;
        const schedule = [];
        const startDate = loan.disbursedDate || new Date();

        for (let i = 1; i <= tenure; i++) {
            const interest = balance * monthlyRate;
            const principalPaid = emi - interest;
            balance -= principalPaid;
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            schedule.push({
                loanId: loan._id,
                dueDate,
                amount: Math.round(emi),
                principalPaid: Math.round(principalPaid),
                interestPaid: Math.round(interest),
                status: 'pending'
            });
        }

        await Repayment.insertMany(schedule);

        // Update loan with EMI and nextDueDate
        loan.emi = Math.round(emi);
        loan.outstandingBalance = principal;
        loan.nextDueDate = schedule[0].dueDate;
        loan.status = 'active';
        await loan.save();

        res.json({ message: 'Repayment schedule generated', count: schedule.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Record a payment (mark EMI as paid)
app.post('/api/repayments/pay/:repaymentId', authMiddleware, async (req, res) => {
    try {
        if (!['Admin', 'Banker'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const repayment = await Repayment.findById(req.params.repaymentId).populate('loanId');
        if (!repayment) return res.status(404).json({ message: 'Repayment not found' });

        repayment.status = 'paid';
        repayment.paidDate = new Date();
        repayment.paidBy = req.user.id;
        await repayment.save();

        // Update loan outstanding balance and next due date
        const loan = await LoanApplication.findById(repayment.loanId._id);
        if (loan) {
            loan.outstandingBalance -= repayment.principalPaid;
            loan.totalPaid = (loan.totalPaid || 0) + repayment.amount;
            // Find next pending repayment
            const nextPending = await Repayment.findOne({
                loanId: loan._id,
                status: 'pending'
            }).sort({ dueDate: 1 });
            loan.nextDueDate = nextPending ? nextPending.dueDate : null;
            if (!nextPending) loan.status = 'closed';
            await loan.save();
        }

        res.json({ message: 'Payment recorded', repayment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get summary for dashboard (optional)
app.get('/api/repayments/summary', authMiddleware, async (req, res) => {
    try {
        let match = {};
        if (req.user.role === 'Customer') {
            match.userId = req.user.id;
        }
        const loans = await LoanApplication.aggregate([
            { $match: match },
            { $group: {
                _id: null,
                totalActiveLoans: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                totalOutstanding: { $sum: '$outstandingBalance' },
                totalPaid: { $sum: '$totalPaid' }
            }}
        ]);
        res.json(loans[0] || { totalActiveLoans: 0, totalOutstanding: 0, totalPaid: 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Profile route (JWT protected)
// ==================== PROFILE & PASSWORD MANAGEMENT ====================

// Get current user profile
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update profile (username, fullName, emailId)
app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, fullName, emailId } = req.body;

        // Check if username is taken (if changed)
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ message: "Username already taken" });
            }
        }

        // Check if email is taken (if changed)
        if (emailId) {
            const existingUser = await User.findOne({ emailId, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ message: "Email already in use" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { username, fullName, emailId } },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Change password
app.put('/api/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// ==================== EMI CALCULATOR ====================
app.post('/api/calculate-emi', (req, res) => {
    const { amount, rate, tenure, tenureType = 'months' } = req.body;
    
    let principal = parseFloat(amount);
    let annualRate = parseFloat(rate);
    let tenureMonths = parseInt(tenure);
    
    if (tenureType === 'years') tenureMonths *= 12;
    
    if (!principal || !annualRate || !tenureMonths) {
        return res.status(400).json({ message: 'Missing parameters' });
    }
    
    const monthlyRate = annualRate / (12 * 100);
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    
    const totalPayment = emi * tenureMonths;
    const totalInterest = totalPayment - principal;
    
    res.json({
        emi: Math.round(emi),
        totalInterest: Math.round(totalInterest),
        totalPayment: Math.round(totalPayment),
        monthlyRate: monthlyRate * 100,
        tenureMonths
    });
});

// ==================== ELIGIBILITY CHECK ====================
app.post('/api/check-eligibility', (req, res) => {
    const { monthlyIncome, existingEmi = 0, creditScore, requestedAmount, tenureMonths } = req.body;
    
    // Simple rule: max EMI = 50% of monthly income - existing EMI
    const maxEmi = monthlyIncome * 0.5 - existingEmi;
    
    // Assume a fixed interest rate (could be taken from loan product)
    const interestRate = 10.5; // %
    const monthlyRate = interestRate / (12 * 100);
    
    // Calculate maximum loan amount for that EMI
    const maxLoanAmount = maxEmi * (Math.pow(1 + monthlyRate, tenureMonths) - 1) /
                         (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));
    
    // Adjust based on credit score
    let eligibilityMultiplier = 1;
    if (creditScore >= 750) eligibilityMultiplier = 1.2;
    else if (creditScore >= 650) eligibilityMultiplier = 1;
    else if (creditScore >= 550) eligibilityMultiplier = 0.7;
    else eligibilityMultiplier = 0.4;
    
    const eligibleAmount = Math.min(requestedAmount, maxLoanAmount * eligibilityMultiplier);
    const isEligible = eligibleAmount >= requestedAmount * 0.8; // if at least 80% of requested
    
    res.json({
        eligibleAmount: Math.round(eligibleAmount),
        maxEmi: Math.round(maxEmi),
        suggestedTenure: tenureMonths,
        isEligible,
        message: isEligible ? 'You are eligible for this loan' : 'Loan amount may be reduced'
    });
});

// ==================== SUPPORT TICKET ROUTES ====================

// Create a new ticket
app.post('/api/tickets', authMiddleware, async (req, res) => {
    try {
        const { subject, message, priority } = req.body;
        const ticket = new SupportTicket({
            userId: req.user.id,
            subject,
            message,
            priority: priority || 'medium'
        });
        await ticket.save();
        
        // Populate user details for response
        await ticket.populate('userId', 'fullName email username');
        
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get tickets – customers see own; bankers/admins see all
app.get('/api/tickets', authMiddleware, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'Customer') {
            filter = { userId: req.user.id };
        }
        const tickets = await SupportTicket.find(filter)
            .populate('userId', 'fullName email')
            .populate('assignedTo', 'fullName')
            .populate('replies.userId', 'fullName role')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single ticket
app.get('/api/tickets/:id', authMiddleware, async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('userId', 'fullName email')
            .populate('assignedTo', 'fullName')
            .populate('replies.userId', 'fullName role');
        
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        
        // Authorization: customer can only see own tickets
        if (req.user.role === 'Customer' && ticket.userId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add reply to ticket
app.post('/api/tickets/:id/reply', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Reply message is required' });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Authorization: customer can reply to own tickets, bankers/admins can reply to any
        if (req.user.role === 'Customer' && ticket.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        ticket.replies.push({
            userId: req.user.id,
            message,
            createdAt: new Date()
        });

        // If customer replies, set status back to open if it was closed
        if (req.user.role === 'Customer' && ticket.status === 'closed') {
            ticket.status = 'open';
        }

        await ticket.save();
        await ticket.populate('replies.userId', 'fullName role');
        
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update ticket status / assign (banker/admin only)
app.put('/api/tickets/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'Customer') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { status, assignedTo, priority } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (status) ticket.status = status;
        if (assignedTo) ticket.assignedTo = assignedTo;
        if (priority) ticket.priority = priority;

        await ticket.save();
        await ticket.populate('assignedTo', 'fullName');
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete ticket (admin only)
app.delete('/api/tickets/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only admins can delete tickets' });
        }
        const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        res.json({ message: 'Ticket deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==================== AUDIT LOG ROUTES ====================

// Get audit logs with filtering and pagination
app.get('/api/audit-logs', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, collection, userId, action, startDate, endDate } = req.query;
        const filter = {};

        // Role-based access: customers see only their own logs
        if (req.user.role === 'Customer') {
            filter.userId = req.user.id;
        }

        if (collection) filter.collectionName = collection;
        if (userId && req.user.role !== 'Customer') filter.userId = userId; // only non-customers can filter by other users
        if (action) filter.action = action;
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const total = await AuditLog.countDocuments(filter);
        const logs = await AuditLog.find(filter)
            .populate('userId', 'fullName email role')
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            logs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single audit log by ID (optional)
app.get('/api/audit-logs/:id', authMiddleware, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id).populate('userId', 'fullName email');
        if (!log) return res.status(404).json({ message: 'Log not found' });
        // Check permission: customer can only see if it's their own
        if (req.user.role === 'Customer' && log.userId?._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.use('/api/chatbot', chatbotRoutes);

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});