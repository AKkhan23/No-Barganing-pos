import { Schema } from 'mongoose';

export function scopePlugin(schema: Schema) {
  schema.add({ created_by: { type: String, default: null, index: true } });

  schema.pre('save', function (this: any) {
    if (this.isNew && !this.created_by) {
      this.created_by = null;
    }
  });
}
