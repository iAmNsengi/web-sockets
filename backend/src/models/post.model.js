import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User matching id is required"],
    },
    authorName: { type: String, required: [true, "author name is required"] },
    content: {
      type: String,
      required: false,
    },
    image: { type: String, required: false },
    comments: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: [true, "Commentor's UUID is required"],
        },
        comment: { type: String, required: [true, "Comment can't be null"] },
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User's UUID is required"],
      },
    ],
  },
  { timestamps: true }
);

postSchema.index({ author: 1, timestamps: 1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
