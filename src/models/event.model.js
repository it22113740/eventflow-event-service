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
    /** Display price per ticket (0 = free). */
    ticketPrice: {
      type: Number,
      default: 0,
      min: [0, "Ticket price cannot be negative"],
    },
    /** Cover image (Cloudinary URL). */
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Image URL is too long"],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: "At most 20 tags allowed",
      },
    },
    /** Short bullet points for detail page (max 5). */
    highlights: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "At most 5 highlights allowed",
      },
    },
    venueType: {
      type: String,
      enum: ["indoor", "outdoor", "hybrid"],
      default: "indoor",
    },
    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation policy cannot exceed 500 characters"],
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
eventSchema.index({ title: "text", category: "text", description: "text" });

// Compound index for common list queries
eventSchema.index({ date: 1, category: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ venueType: 1 });

module.exports = mongoose.model("Event", eventSchema);
