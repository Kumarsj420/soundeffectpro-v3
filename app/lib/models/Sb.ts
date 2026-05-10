import mongoose, { Schema, Model } from "mongoose";


export interface ISoundboard extends Document {
    sb_id: string,
    s_id: string,
    createdAt: Date,
    updatedAt: Date,
}

const SoundboardSchema = new Schema<ISoundboard>({
    sb_id: {
        type: String,
        required: true
    },
    s_id: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'soundboard'
})

const Board: Model<ISoundboard> = mongoose.models.Soundboard || mongoose.model<ISoundboard>('Soundboard', SoundboardSchema, "soundboard");

export default Board;