const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [300, "Location cannot exceed 300 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    createdBy: {
      type: String,
      required: [true, "createdBy (userId) is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Text index for full-text search on title and category
eventSchema.index({ title: "text", category: "text" });

// Compound index for common list queries
eventSchema.index({ date: 1, category: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Event", eventSchema);
