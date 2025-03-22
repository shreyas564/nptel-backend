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
    process.exit(1); // Exit the process with an error
  });

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  score: { type: Number, required: true },
  courseName: { type: String, required: true }, // Add courseName field
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create the User model
const User = mongoose.model('User', userSchema);

// API endpoint to store data
app.post('/store-data', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, email, score, courseName } = req.body; // Add courseName to destructuring

  if (!name || !email || score === undefined || !courseName) {
    return res.status(400).json({ error: 'Name, email, score, and courseName are required' });
  }

  // Validate score to ensure it's a number
  if (isNaN(score)) {
    return res.status(400).json({ error: 'Score must be a number' });
  }

  User.findOne({ email })
    .then(user => {
      if (user) {
        // Update existing user
        user.name = name;
        user.score = score;
        user.courseName = courseName; // Update courseName
        user.updatedAt = Date.now();
        return user.save()
          .then(() => res.status(200).json({ message: 'User data updated successfully' }));
      } else {
        // Create new user
        const newUser = new User({ name, email, score, courseName }); // Include courseName
        return newUser.save()
          .then(() => res.status(201).json({ message: 'User data stored successfully' }));
      }
    })
    .catch(error => {
      console.error('Error storing data:', error);
      res.status(500).json({ error: 'Failed to store data' });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
