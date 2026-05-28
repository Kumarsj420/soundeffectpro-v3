import mongoose, { Schema, Model, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface ISoundboard extends Document {
    sbId:      string;        // public share code (uuid, 8 chars)
    userId:    string;        // owner uid
    name:      string;
    sounds:    string[];      // ordered list of s_ids (max 30)
    isPublic:  boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SoundboardSchema = new Schema<ISoundboard>({
    sbId:     {
        type:    String,
        required: true,
        unique:   true,
        default: () => uuidv4().replace(/-/g, "").slice(0, 10),
    },
    userId:   { type: String, required: true },
    name:     { type: String, required: true, trim: true, maxlength: 60 },
    sounds:   { type: [String], default: [] },    // array of s_ids, max 30
    isPublic: { type: Boolean, default: true },
}, {
    timestamps: true,
    collection: "soundboards",
});

SoundboardSchema.index({ userId: 1, createdAt: -1 });
SoundboardSchema.index({ sbId: 1 }, { unique: true });

const Soundboard: Model<ISoundboard> =
    mongoose.models.Soundboard2 ||
    mongoose.model<ISoundboard>("Soundboard2", SoundboardSchema, "soundboards");

export default Soundboard;
