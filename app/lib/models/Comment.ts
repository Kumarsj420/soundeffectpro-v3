import mongoose, { Schema, Model, Document } from "mongoose";

export interface IComment extends Document {
    soundId:   string;        // s_id of the sound
    userId:    string;        // uid of the commenter
    userName:  string;
    userImage: string | null;
    text:      string;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
    soundId:   { type: String, required: true },
    userId:    { type: String, required: true },
    userName:  { type: String, required: true },
    userImage: { type: String, default: null },
    text:      { type: String, required: true, maxlength: 500, trim: true },
}, {
    timestamps: true,
    collection: "comments",
});

// Main query: list comments for a sound, newest first
CommentSchema.index({ soundId: 1, createdAt: -1 });
// For deleting own comments quickly
CommentSchema.index({ userId: 1, createdAt: -1 });

const Comment: Model<IComment> =
    mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
