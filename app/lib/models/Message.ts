import mongoose, { Schema, Model } from "mongoose";

export interface IMessage {
    name: string;
    senderEmail: string;
    type: "contact" | "feedback" | "inquiry" | "support" | "technical issue" | "other";
    content: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    senderEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please provide a valid email address"
        ],
    },

    type: {
        type: String,
        required: true,
        enum: [
            "contact",
            "feedback",
            "inquiry",
            "support",
            "technical issue",
            "other"
        ],
        default: "contact",
        index: true
    },

    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 600,
    },

    read: {
        type: Boolean,
        default: false,
        index: true
    }

}, {
    timestamps: true,
    collection: "messages"
});

MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ read: 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ senderEmail: 1 });

const Message: Model<IMessage> =
    mongoose.models.Message ||
    mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
