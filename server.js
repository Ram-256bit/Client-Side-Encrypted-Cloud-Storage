const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS so the HTML file can talk to this server
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'db.json');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// Configure Multer to save files to 'uploads/' folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the name sent by the client (which ends in .enc)
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- HELPER FUNCTIONS ---
// Read the JSON "Database"
const readDb = () => {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
};

// Write to the JSON "Database"
const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ROUTES ---

// 1. Upload Endpoint
// 'file' matches the formData name in client
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        const { iv, salt } = req.body; // Metadata sent from client
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No file uploaded" });

        // Save metadata to db.json
        const db = readDb();
        db.push({
            fileName: file.filename,
            originalName: file.originalname,
            iv: iv,
            salt: salt,
            path: `/download/${file.filename}`
        });
        writeDb(db);

        console.log(`Received encrypted file: ${file.filename}`);
        res.json({ message: "File stored successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. List Files Endpoint
app.get('/files', (req, res) => {
    const db = readDb();
    res.json(db);
});

// 3. Download Endpoint
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: "File not found" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});