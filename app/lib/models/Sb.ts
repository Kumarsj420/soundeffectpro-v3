import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISbEntry extends Document {
    sb_id:     string;
    s_id:      string;
    createdAt: Date;
    updatedAt: Date;
}

const SbSchema = new Schema<ISbEntry>({
    sb_id: { type: String, required: true },
    s_id:  { type: String, required: true },
}, {
    timestamps: true,
    collection: "soundboard",
});

SbSchema.index({ sb_id: 1 });
SbSchema.index({ sb_id: 1, s_id: 1 }, { unique: true });

const SbModel: Model<ISbEntry> =
    mongoose.models.SbEntry ||
    mongoose.model<ISbEntry>("SbEntry", SbSchema, "soundboard");

export default SbModel;