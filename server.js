const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
console.log('MONGO_URI:', mongoURI); // Debug log

if (!mongoURI) {
  console.error('Error: MONGO_URI is not defined in the .env file or environment variables.');
  process.exit(1); // Exit the process with an error
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
  email: { type: String, required: true }, // No unique constraint
  score: { type: Number, required: true },
  courseName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Ensure uniqueness based on email + courseName
userSchema.index({ email: 1, courseName: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

// API endpoint to store or update course data for a user
app.post('/store-data', async (req, res) => {
  const { name, email, score, courseName } = req.body;

  if (!name || !email || score === undefined || !courseName) {
    return res.status(400).json({ error: 'Name, email, score, and courseName are required' });
  }

  if (isNaN(score)) {
    return res.status(400).json({ error: 'Score must be a number' });
  }

  try {
    // Update if email & courseName match, otherwise insert new
    const result = await User.updateOne(
      { email, courseName }, // Unique condition
      { $set: { name, score, updatedAt: Date.now() } }, // Update fields
      { upsert: true } // Insert if not found
    );

    if (result.upsertedCount > 0) {
      res.status(201).json({ message: 'New course entry stored successfully' });
    } else if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Course entry updated successfully' });
    } else {
      res.status(200).json({ message: 'No changes were made' });
    }
  } catch (error) {
    console.error('Error storing data:', error);
    res.status(500).json({ error: 'Failed to store data' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
