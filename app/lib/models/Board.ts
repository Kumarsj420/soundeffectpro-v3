import mongoose, { Schema, Model, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IBoard extends Document {
    sbId:      string;
    userId:    string;
    name:      string;
    slug:      string;
    thumbnail: string;
    isPublic:  boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BoardSchema = new Schema<IBoard>({
    sbId:      { type: String, required: true, unique: true, default: () => uuidv4().replace(/-/g, "").slice(0, 10) },
    userId:    { type: String, required: true },
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    slug:      { type: String, default: "", trim: true, lowercase: true },
    thumbnail: { type: String, default: "" },
    isPublic:  { type: Boolean, default: true },
}, {
    timestamps: true,
    collection: "soundboards",
});

BoardSchema.index({ userId: 1, createdAt: -1 });
BoardSchema.index({ sbId: 1 }, { unique: true });
BoardSchema.index({ isPublic: 1, thumbnail: 1, createdAt: -1 });
BoardSchema.index({ name: "text" });

const Board: Model<IBoard> =
    mongoose.models.Board ||
    mongoose.model<IBoard>("Board", BoardSchema, "soundboards");

export default Board;
