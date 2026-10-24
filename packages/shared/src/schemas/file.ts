import { z } from 'zod';

export const FilePathSchema = z.string().min(1).max(4096);

export const RenameSchema = z.object({
  from: FilePathSchema,
  to: FilePathSchema,
});

export const MoveSchema = z.object({
  src: FilePathSchema,
  dest: FilePathSchema,
});

export const CreateFolderSchema = z.object({
  path: FilePathSchema,
});

export const DeleteSchema = z.object({
  paths: z.array(FilePathSchema).min(1).max(100),
});
