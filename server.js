require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection failed:", err));

// Updated User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    emailId: { type: String, required: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Customer' }, // Default is Customer
    projectName: { type: String, default: 'LoanApp_v19' }, // New Field
    docPath: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now } // Automatically set the date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);



const loanDetailSchema = new mongoose.Schema({
    bankName: String,
    loanAmount: Number,
    emi: Number
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir); // Create folder if not exists
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Unique filename: loanId-timestamp.pdf
        cb(null, `loan-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });



// Register API
app.post('/api/register', async (req, res) => {
    try {
        const { username, emailId, fullName, password, role, projectName } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            emailId,
            fullName,
            password: hashedPassword,
            role: role || 'Customer', // Use selected role or fallback
            projectName: projectName || 'LoanApp_v19'
        });

        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(400).json({ message: "Registration failed", error: error.message });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({
        token,
        user: {
            username: user.username,
            fullName: user.fullName,
            emailId: user.emailId,
            role: user.role
        }
    });
});

const loanApplicationSchema = new mongoose.Schema({
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
    loans: [loanDetailSchema], // Array of existing loans
    createdAt: { type: Date, default: Date.now }
});

const LoanApplication = mongoose.model('LoanApplication', loanApplicationSchema);

// Protected Route Example
app.get('/api/profile', authMiddleware, (req, res) => {
    res.json({ message: "Protected data", user: req.user });
});

// Add this to server.js
app.get('/api/users', async (req, res) => {
    try {
        // Find all users but don't send the hashed password for security
        // Use .select('-password') to hide sensitive data
        const users = await User.find().select('-password'); 
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET Dashboard Statistics
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        // Run aggregation to get counts by status
        const stats = await LoanApplication.aggregate([
            {
                $group: {
                    _id: "$applicationStatus", // Groups by 'pending', 'approved', etc.
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$salary" } // Or your loan amount field
                }
            }
        ]);

        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // Get total applications count
        const totalApps = await LoanApplication.countDocuments();

        res.json({ stats, totalUsers, totalApps });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/upload-doc/:id', upload.single('file'), async (req, res) => {
    try {
        const loan = await LoanApplication.findByIdAndUpdate(
            req.params.id,
            { docPath: req.file.path }, // Ensure 'docPath' is in your Mongoose Schema
            { new: true }
        );
        res.json({ message: "Document Uploaded!", path: req.file.path });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/save-loan', async (req, res) => {
    try {
        const newApplication = new LoanApplication(req.body);
        await newApplication.save();
        res.status(201).json({ message: "Application submitted successfully!", data: newApplication });
    } catch (error) {
        res.status(400).json({ message: "Error saving application", error: error.message });
    }
});

// Add this to server.js
app.get('/api/get-loans', async (req, res) => {
    try {
        let { page = 1, limit = 5, search = '', status = '' } = req.query;
        
        // Build Filter Query
        const filter = {
            fullName: { $regex: search, $options: 'i' } // Search by name
        };
        if (status) filter.applicationStatus = status; // Filter by status

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


// DELETE Application
app.delete('/api/delete-loan/:id', async (req, res) => {
    try {
        const result = await LoanApplication.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).send("Application not found");
        res.json({ message: "Successfully deleted" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// UPDATE Application
// server.js - Update this specific route
app.put('/api/update-loan/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Use findByIdAndUpdate which automatically maps the string ID to MongoDB's _id
        const updatedData = await LoanApplication.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true }
        );

        if (!updatedData) {
            console.log("No document found with ID:", id);
            return res.status(404).json({ message: "Application not found in database" });
        }

        res.json({ message: "Updated successfully", data: updatedData });
    } catch (error) {
        res.status(400).json({ message: "Update error", error: error.message });
    }
});



// GET Single Application (For editing)
app.get('/api/get-loan/:id', async (req, res) => {
    try {
        const application = await LoanApplication.findById(req.params.id);
        res.json(application);
    } catch (error) {
        res.status(404).json({ message: "Not found" });
    }
});

// DELETE User by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




// JWT Middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
}

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
