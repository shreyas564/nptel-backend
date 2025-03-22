const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
console.log('MONGO_URI:', mongoURI);

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

// Ensure uniqueness based on email + courseName
userSchema.index({ email: 1, courseName: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

// API endpoint to store or update course data for a user
app.post('/store-data', async (req, res) => {
  try {
    console.log('Incoming request:', req.body);

    const { name, email, score, courseName } = req.body;

    if (!name || !email || score === undefined || !courseName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (isNaN(score)) {
      return res.status(400).json({ error: 'Score must be a number' });
    }

    const result = await User.findOneAndUpdate(
      { email, courseName },
      { $set: { name, score, updatedAt: Date.now() } },
      { upsert: true, new: true, runValidators: true }
    );

    console.log('Database operation result:', result);
    res.status(200).json({ message: 'Data stored/updated successfully' });

  } catch (error) {
    console.error('Error storing data:', error);

    if (error.code === 11000) {
      return res.status(409).json({ error: 'Duplicate entry detected' });
    }

    res.status(500).json({ error: 'Failed to store data' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
