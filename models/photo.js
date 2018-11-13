const mongoose = require("mongoose");

// Schema Setup
const photoSchema = new mongoose.Schema({
  name: String,
  image: {
    id: String,
    url: String
  },
  description: String,
  location: String,
  createdAt: { type: Date, default: Date.now },
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }
  ]
});

module.exports = mongoose.model("photo", photoSchema);
