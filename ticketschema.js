const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  project: {
    type: String,
    required: true
  },
  assignedTo: {
    type: String,
    required: true
  },
  assignedBy: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    required: true
  }
});

module.exports = TicketSchema = mongoose.model('TicketDetails', ticketSchema);
