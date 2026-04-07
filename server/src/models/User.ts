import bcrypt from "bcryptjs";
import { Schema, model, type Document } from "mongoose";

export interface UserDocument extends Document {
  email: string;
  name: string;
  passwordHash: string;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.comparePassword = async function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const UserModel = model<UserDocument>("User", userSchema);
