import Post from "../models/post.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { notifyNewPost, notifyPostLike } from "../utils/configs/socket.js";
import { retryMiddleware } from "../middlewares/retry.middleware.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { successResponse } from "../utils/responseHandlers.js";

const getPost = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post with id was not found");
  return post;
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const after = req.query.after; // Timestamp of the most recent post

    const conversations = await Message.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    });

    const usersWeChat = [
      ...new Set(
        conversations.flatMap((convo) => [
          convo.senderId.toString(),
          convo.receiverId.toString(),
        ])
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    // Build query based on whether we're fetching newer or older posts
    const query = {
      author: { $in: usersWeChat },
      ...(after && { createdAt: { $gt: new Date(after) } }),
    };

    const posts = await Post.find(query)
      .sort("-createdAt")
      .skip(after ? 0 : skip) // Skip only when fetching older posts
      .limit(limit)
      .populate("author", "fullName profilePic")
      .populate("comments.sender", "fullName profilePic");

    // Add cache control headers
    res.set("Cache-Control", "private, max-age=300"); // 5 minutes cache

    res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createPost = async (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user._id;

    const newPost = await Post.create({
      content,
      image,
      author: userId,
      authorName: req.user.fullName,
    });

    // Find users who chat with the post creator
    const conversations = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const usersToNotify = [
      ...new Set(
        conversations.flatMap((convo) => [
          convo.senderId.toString(),
          convo.receiverId.toString(),
        ])
      ),
    ].filter((id) => id !== userId.toString());

    // Notify connected users about the new post
    notifyNewPost(newPost, usersToNotify);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating post",
    });
  }
};

export const likePost = retryMiddleware(
  catchAsync(async (req, res, next) => {
    const { post_id } = req.params;
    const post = await getPost(post_id);

    let isLiked = false;
    if (post?.likes?.length) {
      isLiked = post.likes.includes(req.user._id);
      if (isLiked)
        post.likes = post.likes.filter(
          (id) => id.toString() !== req.user._id.toString()
        );
      else post.likes.push(req.user._id);
    } else post.likes.push(req.user._id);

    await post.save();

    console.log(post);

    // Find users who chat with the post creator
    const conversations = await Message.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    });

    const usersToNotify = [
      ...new Set(
        conversations.flatMap((convo) => [
          convo.senderId.toString(),
          convo.receiverId.toString(),
        ])
      ),
    ].filter((id) => id !== req.user._id.toString());

    notifyPostLike(post, usersToNotify);

    res.status(200).json({
      success: true,
      data: {
        post: post._id,
        likes: post.likes.length,
        isLiked: !isLiked,
      },
    });
  })
);

export const commentOnPost = retryMiddleware(
  catchAsync(async (req, res, next) => {
    const { post_id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return next(new AppError("Comment text is required", 400));
    }

    const post = await getPost(post_id);
    post.comments.push({
      sender: req.user._id,
      comment: comment,
    });

    await post.save();

    // Fetch the updated post with populated data
    const updatedPost = await Post.findById(post_id)
      .populate("author", "fullName profilePic")
      .populate("comments.sender", "fullName profilePic");

    // TODO: Implement socket notification for new comments
    // notifyNewComment(updatedPost, post.author);

    successResponse(res, 201, updatedPost);
  })
);

export const deletePost = retryMiddleware(
  catchAsync(async (req, res, next) => {
    const { post_id } = req.params;
    const post = getPost(post_id);
    if (!(post.author.toString() === req.user._id.toString()))
      return next(
        new AppError("You can't delete this post you are not the author")
      );
    await Post.findByIdAndDelete(post_id);
    successResponse(res, 200, { message: "Post deleted successfully" });
  })
);
