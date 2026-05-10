import mongoose, { Schema, Model } from "mongoose";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { getWeekStart, getMonthStart, getHalfYearStart } from "../statsPeriod";


export interface PeriodStat {
  views: number;
  periodStart: Date;
}

export interface CatStats {
  views: number;
  reports: number;
  halfYearly: PeriodStat;
  monthly: PeriodStat;
  weekly: PeriodStat;
}


export interface CategoryInterface {
  _id: Types.ObjectId;
  sb_id: string;
  name: string;
  slug: string;
  thumb: string | null;
  visibility: boolean;
  total_sfx: number;
  stats: CatStats;
  createdAt: Date;
  updatedAt: Date;
  user: {
    uid: string;
    name: string;
  };
}



const PeriodStatSchema = new Schema<PeriodStat>(
  {
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    periodStart: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const CatStatsSchema = new Schema<CatStats>(
  {
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    reports: {
      type: Number,
      default: 0,
      min: 0,
    },
    halfYearly: {
      type: PeriodStatSchema,
      required: true,
      default: () => ({
        views: 0,
        periodStart: getHalfYearStart(),
      }),
    },
    monthly: {
      type: PeriodStatSchema,
      required: true,
      default: () => ({
        views: 0,
        periodStart: getMonthStart(),
      }),
    },
    weekly: {
      type: PeriodStatSchema,
      required: true,
      default: () => ({
        views: 0,
        periodStart: getWeekStart(),
      }),
    },
  },
  { _id: false }
);



const CategorySchema = new Schema<CategoryInterface>(
  {
    sb_id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4().replace(/-/g, ""),
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    thumb: {
      type: String,
      default: null,
    },
    visibility: {
      type: Boolean,
      required: true,
      default: true,
    },
    total_sfx: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stats: {
      type: CatStatsSchema,
      default: () => ({
        views: 0,
        reports: 0,
        halfYearly: {
          views: 0,
          periodStart: new Date("2026-01-01T00:00:00.000Z"),
        },
        monthly: {
          views: 0,
          periodStart: new Date(),
        },
        weekly: {
          views: 0,
          periodStart: new Date(),
        },
      }),
    },
    user: {
      uid: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    collection: "categories",
  }
);


// text search
CategorySchema.index({ name: "text" });


CategorySchema.index({ createdAt: -1 });


CategorySchema.index({ "stats.views": -1 });
CategorySchema.index({ "stats.weekly.views": -1 });
CategorySchema.index({ "stats.monthly.views": -1 });



const Category: Model<CategoryInterface> =
  mongoose.models.Categories ||
  mongoose.model<CategoryInterface>("Categories", CategorySchema);

export default Category;
