const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS to allow requests from the Chrome extension and the webpage
app.use(cors({
  origin: [
    'chrome-extension://jpodbbdeijbdjkhhafhedahegamgdjpp',
    'http://localhost:3000',
    'https://nptel-marks-fetcher.onrender.com',
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: false,
}));

// Middleware
app.use(express.json()); // Parse JSON bodies

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
console.log('MONGO_URI:', mongoURI);

if (!mongoURI) {
  console.error('Error: MONGO_URI is not defined in the .env file or environment variables.');
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  score: { type: Number, required: true },
  courseName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create the User model
const User = mongoose.model('User', userSchema);

// API endpoint to store data
app.post('/store-data', async (req, res) => {
  const { name, email, score, courseName } = req.body;

  // Validate required fields
  if (!name || !email || score === undefined || !courseName) {
    return res.status(400).json({ error: 'Name, email, score, and courseName are required' });
  }

  // Validate score to ensure it's a number
  if (isNaN(score)) {
    return res.status(400).json({ error: 'Score must be a number' });
  }

  try {
    // Check if a record with the same name, email, and courseName already exists
    const existingUser = await User.findOne({ name, email, courseName });

    if (existingUser) {
      // Update the existing record
      existingUser.score = score;
      existingUser.updatedAt = Date.now();
      await existingUser.save();
      return res.status(200).json({ message: 'Course already present, score updated' });
    } else {
      // Create a new record
      const newUser = new User({ name, email, score, courseName });
      await newUser.save();
      return res.status(201).json({ message: 'User data stored successfully' });
    }
  } catch (error) {
    console.error('Error storing data:', error);
    // Provide more specific error messages based on the type of error
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // This error code (11000) would occur if we had a unique index, but we’re handling duplicates manually
      return res.status(400).json({ error: 'Course already present' });
    } else if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed: ' + error.message });
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return res.status(500).json({ error: 'Database connection error, please try again later' });
    }
    // Fallback for any other errors
    res.status(500).json({ error: 'Failed to store data: ' + error.message });
  }
});

// API endpoint to fetch data by email
app.get('/fetch-data', async (req, res) => {
  const { email } = req.query;

  // Validate required query parameter
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find all records matching the email, return only name, courseName, and score
    const records = await User.find({ email }).select('name courseName score -_id');
    if (records.length === 0) {
      return res.status(404).json({ message: 'No records found for the given email' });
    }
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
