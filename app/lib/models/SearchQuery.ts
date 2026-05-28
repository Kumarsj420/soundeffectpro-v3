import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISearchQuery extends Document {
    term:      string;
    count:     number;
    updatedAt: Date;
}

const SearchQuerySchema = new Schema<ISearchQuery>({
    term:  { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    count: { type: Number, default: 1, min: 0 },
}, {
    timestamps: { createdAt: false, updatedAt: true },
    collection: "searchqueries",
});

SearchQuerySchema.index({ count: -1 });
SearchQuerySchema.index({ term: 1, count: -1 });

const SearchQuery: Model<ISearchQuery> =
    mongoose.models.SearchQuery ||
    mongoose.model<ISearchQuery>("SearchQuery", SearchQuerySchema);

export default SearchQuery;
