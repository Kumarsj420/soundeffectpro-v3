import mongoose, { Schema, Model } from "mongoose";
import { REPORT_TYPES, ReportType } from "@/app/lib/constants";

export interface IReport {
    senderEmail: string;
    type: ReportType;
    target: {
        from: "sound" | "soundboard";
        id: string;
    };
    content: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
    {
        senderEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },

        type: {
            type: String,
            enum: REPORT_TYPES,
            default: "other",
            required: true,
        },

        target: {
            from: {
                type: String,
                enum: ["sound", "soundboard"],
                required: true,
            },

            id: {
                type: String,
                required: true,
                index: true,
            },
        },

        content: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 1000,
        },

        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        collection: "reports",
    }
);

ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ read: 1, createdAt: -1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ "target.from": 1, "target.id": 1 });

const Report: Model<IReport> =
    mongoose.models.Report ||
    mongoose.model<IReport>("Report", ReportSchema);

export default Report;
