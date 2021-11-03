const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  }
});

const chatModel = mongoose.model('chat', chatSchema);

module.exports = chatModel;

