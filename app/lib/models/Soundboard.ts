import mongoose, { Schema, Model, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface ISoundboard extends Document {
    sbId:      string;
    userId:    string;
    name:      string;
    thumbnail: string;
    isPublic:  boolean;
    sounds?:   string[];   // legacy — being migrated to Sb collection, do not use
    createdAt: Date;
    updatedAt: Date;
}

const SoundboardSchema = new Schema<ISoundboard>({
    sbId:      { type: String, required: true, unique: true, default: () => uuidv4().replace(/-/g, "").slice(0, 10) },
    userId:    { type: String, required: true },
    name:      { type: String, required: true, trim: true, maxlength: 60 },
    thumbnail: { type: String, default: "" },
    isPublic:  { type: Boolean, default: true },
    sounds:    { type: [String], default: undefined },   // legacy, kept only for migration
}, {
    timestamps: true,
    collection: "soundboards",
});

SoundboardSchema.index({ userId: 1, createdAt: -1 });
SoundboardSchema.index({ sbId: 1 }, { unique: true });
SoundboardSchema.index({ isPublic: 1, thumbnail: 1, createdAt: -1 });
SoundboardSchema.index({ name: "text" });

const Soundboard: Model<ISoundboard> =
    mongoose.models.Soundboard2 ||
    mongoose.model<ISoundboard>("Soundboard2", SoundboardSchema, "soundboards");

export default Soundboard;
