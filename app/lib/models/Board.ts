import mongoose, { Schema, Model, Document } from "mongoose";
import { getWeekStart, getMonthStart, getHalfYearStart } from "../statsPeriod";
import { v4 as uuidv4 } from "uuid";

export interface PeriodStat {
    views:       number;
    periodStart: Date;
}

export interface BoardStats {
    views:      number;
    reports:    number;
    halfYearly: PeriodStat;
    monthly:    PeriodStat;
    weekly:     PeriodStat;
}

export interface IBoard extends Document {
    sb_id:      string;
    name:       string;
    slug:       string;
    thumb:      string | null;
    visibility: boolean;
    total_sfx:  number;
    stats:      BoardStats;
    user:       { uid: string; name: string };
    createdAt:  Date;
    updatedAt:  Date;
}

const PeriodStatSchema = new Schema<PeriodStat>(
    {
        views:       { type: Number, default: 0, min: 0 },
        periodStart: { type: Date, required: true },
    },
    { _id: false }
);

const StatsSchema = new Schema<BoardStats>(
    {
        views:      { type: Number, default: 0, min: 0 },
        reports:    { type: Number, default: 0, min: 0 },
        halfYearly: { type: PeriodStatSchema, required: true, default: () => ({ views: 0, periodStart: getHalfYearStart() }) },
        monthly:    { type: PeriodStatSchema, required: true, default: () => ({ views: 0, periodStart: getMonthStart() }) },
        weekly:     { type: PeriodStatSchema, required: true, default: () => ({ views: 0, periodStart: getWeekStart() }) },
    },
    { _id: false }
);

const BoardSchema = new Schema<IBoard>(
    {
        sb_id:      { type: String, required: true, unique: true, default: () => uuidv4().replace(/-/g, "").slice(0, 10) },
        name:       { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
        slug:       { type: String, default: "", trim: true, lowercase: true },
        thumb:      { type: String, default: null },
        visibility: { type: Boolean, default: true },
        total_sfx:  { type: Number, default: 0, min: 0 },
        stats: {
            type: StatsSchema,
            default: () => ({
                views: 0, reports: 0,
                halfYearly: { views: 0, periodStart: getHalfYearStart() },
                monthly:    { views: 0, periodStart: getMonthStart() },
                weekly:     { views: 0, periodStart: getWeekStart() },
            }),
        },
        user: {
            uid:  { type: String, required: true },
            name: { type: String, required: true },
        },
    },
    {
        timestamps: true,
        collection: "soundboards",
    }
);

BoardSchema.index({ "user.uid": 1, createdAt: -1 });
BoardSchema.index({ sb_id: 1 }, { unique: true });
BoardSchema.index({ visibility: 1, thumb: 1, createdAt: -1 });
BoardSchema.index({ name: "text" });

const Board: Model<IBoard> =
    mongoose.models.Board ||
    mongoose.model<IBoard>("Board", BoardSchema, "soundboards");

export default Board;
