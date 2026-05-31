import mongoose, { Schema, Model, Types, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { getWeekStart, getMonthStart, getHalfYearStart } from "../statsPeriod";
import { CATEGORIES, LICENSE_VALUES, type Category, type License } from "../constants";

export { LICENSE_VALUES, type License };

export interface IFileUser {
    uid: string;
    name: string;
}

export interface IPeriodStat {
    views: number;
    likes: number;
    downloads: number;
    periodStart: Date;
}

export interface IStats {
    views: number;
    likes: number;
    downloads: number;
    reports: number;
    weekly: IPeriodStat;
    monthly: IPeriodStat;
    halfYearly: IPeriodStat;
}

export interface IFile extends Document {
    _id: Types.ObjectId;
    s_id: string;
    title: string;
    slug: string;
    duration: string;
    tags: string[];
    category: Category;
    description: string;
    btnColor: '0' | '20' | '125' | '145' | '195' | '225' | '255' | '280' | '305' | '335';
    user: IFileUser;
    stats: IStats;
    license: License;
    trendScore: number;
    visibility: boolean;
    moderationStatus: 'pending' | 'approved' | 'rejected';
    sourceUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FileUserSchema = new Schema<IFileUser>({
    uid: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, minLength: 3, maxLength: 15 },
}, { _id: false });

const PeriodStatSchema = new Schema<IPeriodStat>({
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    periodStart: { type: Date, required: true },
}, { _id: false });

const StatsSchema = new Schema<IStats>({
    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    downloads: { type: Number, default: 0, min: 0 },
    reports: { type: Number, default: 0, min: 0 },
    weekly: {
        type: PeriodStatSchema,
        default: () => ({ views: 0, likes: 0, downloads: 0, periodStart: getWeekStart() }),
    },
    monthly: {
        type: PeriodStatSchema,
        default: () => ({ views: 0, likes: 0, downloads: 0, periodStart: getMonthStart() }),
    },
    halfYearly: {
        type: PeriodStatSchema,
        default: () => ({ views: 0, likes: 0, downloads: 0, periodStart: getHalfYearStart() }),
    },
}, { _id: false });

const FileSchema = new Schema<IFile>({
    s_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => uuidv4().replace(/-/g, ''),
    },
    title: { type: String, required: true, trim: true, minLength: 3, maxLength: 100 },
    slug: { type: String, lowercase: true, trim: true },
    duration: {
        type: String,
        required: true,
        match: /^(0[0-9]|1[0-9]|20):[0-5][0-9]$|^02:00$/,
    },
    tags: {
        type: [String],
        required: true,
        validate: [
            { validator: (v: string[]) => v.length <= 10, message: 'Max 10 tags allowed' },
            { validator: (v: string[]) => v.every(t => t.length > 0), message: 'Tags must be non-empty' },
            { validator: (v: string[]) => v.every(t => t.length <= 15), message: 'Each tag max 15 chars' },
        ],
    },
    category: {
        type: String,
        enum: CATEGORIES,
        default: 'Random',
    },
    description: { type: String, minLength: 2, maxLength: 600 },
    btnColor: {
        type: String,
        enum: ['0', '20', '125', '145', '195', '225', '255', '280', '305', '335'],
        default: '0',
    },
    user: { type: FileUserSchema, required: true },
    stats: { type: StatsSchema, default: () => ({}) },
    license: {
        type: String,
        enum: LICENSE_VALUES,
        default: 'unknown',
        index: true,
    },
    trendScore: {
        type: Number,
        default: 0,
        index: true,
    },
    visibility: { type: Boolean, default: false },
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved',
    },
    sourceUrl: { type: String, sparse: true },
}, {
    timestamps: true,
    collection: 'files',
});

FileSchema.index({ title: 'text', description: 'text', tags: 'text' });
FileSchema.index({ slug: 1 }, { unique: true, sparse: true });
FileSchema.index({ createdAt: -1 });
FileSchema.index({ 'stats.views': -1 });
FileSchema.index({ 'stats.downloads': -1 });
FileSchema.index({ tags: 1 });
FileSchema.index({ category: 1, 'stats.views': -1 });
FileSchema.index({ visibility: 1, moderationStatus: 1, createdAt: -1 });
FileSchema.index({ visibility: 1, category: 1, 'stats.views': -1 });
FileSchema.index({ visibility: 1, 'stats.weekly.periodStart': 1, 'stats.weekly.views': -1 });

FileSchema.index({ 'stats.weekly.periodStart': 1, 'stats.weekly.views': -1 });
FileSchema.index({ 'stats.weekly.periodStart': 1, 'stats.weekly.downloads': -1 });
FileSchema.index({ 'stats.monthly.periodStart': 1, 'stats.monthly.views': -1 });
FileSchema.index({ 'stats.monthly.periodStart': 1, 'stats.monthly.downloads': -1 });
FileSchema.index({ 'stats.halfYearly.periodStart': 1, 'stats.halfYearly.views': -1 });

// trendScore indexes — used by /trending, category trending, etc.
FileSchema.index({ trendScore: -1 });
FileSchema.index({ visibility: 1, trendScore: -1 });
FileSchema.index({ visibility: 1, category: 1, trendScore: -1 });
FileSchema.index({ visibility: 1, license: 1, trendScore: -1 });
FileSchema.index({ sourceUrl: 1 }, { sparse: true });

const File: Model<IFile> = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
export default File;
