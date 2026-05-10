import mongoose, { Schema, Model } from "mongoose";
import { Document } from "mongoose";

export interface IFav extends Document {
    uid: string;
    s_id: string;
    createdAt: Date;
    updatedAt: Date;
}

const FavSchema = new Schema<IFav>(
    {
        uid: {
            type: String,
            required: true,
        },
        s_id: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "fav",
    }
);

FavSchema.index({ uid: 1 });
FavSchema.index({ uid: 1, s_id: 1 }, { unique: true });

const Fav: Model<IFav> =
    mongoose.models.Fav || mongoose.model<IFav>("Fav", FavSchema, "fav");

export default Fav;
