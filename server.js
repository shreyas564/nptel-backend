const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
  origin: ['chrome-extension://jpodbbdeijbdjkhhafhedahegamgdjpp', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: false,
}));

// Middleware
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('Error: MONGO_URI is not defined.');
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

// API endpoint to store data (Allow multiple courses per user)
app.post('/store-data', async (req, res) => {
  try {
    const { name, email, score, courseName } = req.body;

    if (!name || !email || score === undefined || !courseName) {
      return res.status(400).json({ error: 'Name, email, score, and courseName are required' });
    }

    if (isNaN(score)) {
      return res.status(400).json({ error: 'Score must be a number' });
    }

    // Always create a new record, allowing multiple courses for the same email
    const newUser = new User({ name, email, score, courseName });
    await newUser.save();

    res.status(201).json({ message: 'User data stored successfully' });

  } catch (error) {
    console.error('Error storing data:', error);
    res.status(500).json({ error: 'Failed to store data' });
  }
});

// API endpoint to fetch data by email and name
app.get('/fetch-data', async (req, res) => {
  const { email, name } = req.query;

  // Validate required query parameters
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
    // Find all records matching the email and name
    const records = await User.find({ email, name }).select('courseName score createdAt updatedAt -_id');
    if (records.length === 0) {
      return res.status(404).json({ message: 'No records found for the given email and name' });
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
