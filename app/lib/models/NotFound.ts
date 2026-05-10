import mongoose, { Schema, Model } from "mongoose";

export interface INotFound {
  searchTerm: string;
  count: number;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotFoundSchema = new Schema<INotFound>(
  {

    searchTerm: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },

    count: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "notfound",
  }
);

NotFoundSchema.index({ createdAt: -1 });
NotFoundSchema.index({ searchTerm: 1 });
NotFoundSchema.index({ count: -1 });
NotFoundSchema.index({ read: 1 });

const NotFound: Model<INotFound> =
  mongoose.models.NotFound ||
  mongoose.model<INotFound>("NotFound", NotFoundSchema);

export default NotFound;

