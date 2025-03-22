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
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create the User model
const User = mongoose.model('User', userSchema);

// API endpoint to store data
app.post('/store-data', async (req, res) => {
  const { name, email, score } = req.body;

  if (!name || !email || score === undefined) {
    return res.status(400).json({ error: 'Name, email, and score are required' });
  }

  try {
    // Check if the user already exists (based on email)
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      user.name = name;
      user.score = score;
      user.updatedAt = Date.now();
      await user.save();
      res.status(200).json({ message: 'User data updated successfully' });
    } else {
      // Create new user
      user = new User({ name, email, score });
      await user.save();
      res.status(201).json({ message: 'User data stored successfully' });
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