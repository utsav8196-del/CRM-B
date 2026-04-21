import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Scheduled", "Completed", "Rejected"],
      default: "Pending",
    },
    resume: {
      type: String, // URL to resume file
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
candidateSchema.index({ email: 1 });
candidateSchema.index({ status: 1 });
candidateSchema.index({ createdAt: -1 });

export default mongoose.model("Candidate", candidateSchema);
