import mongoose, { Schema, Model, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IUser extends Document {
    uid: string;
    name?: string;
    email: string;
    image?: string | null;
    provider?: string;
    role: 'user' | 'admin' | 'moderator';
    favCount: number;
    uploadCount: number;
    isProfileCompleted: boolean;
    emailVerified: Date | null;
    preference: {
        theme: string | null;
        nsfw: boolean;
        cookies: boolean;
        language: "en" | "hi" | "ar" | "ur" | "fr" | "de" | "es" | "pt" | "zh" | null;
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    uid: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4().replace(/-/g, ''),
    },
    name: {
        type: String,
        trim: true,
        default: null,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    image: {
        type: String,
        default: null,
    },
    provider: {
        type: String,
        default: null,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user',
    },
    favCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    uploadCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    isProfileCompleted: {
        type: Boolean,
        default: false,
    },
    emailVerified: {
        type: Date,
        default: null,
    },
    preference: {
        theme: { type: String, default: null },
        nsfw: { type: Boolean, default: false },
        cookies: { type: Boolean, default: true },
        language: { type: String, default: null },
    },
}, {
    timestamps: true,
    collection: 'users',
});


const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
