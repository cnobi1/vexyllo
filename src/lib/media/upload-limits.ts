// Kept out of src/lib/actions/uploads.ts because that file has a top-level
// "use server" directive — Next.js requires every export from a "use
// server" file to be an async function, so a plain constant can't live
// there. Shared by uploadImage and uploadAssetImage.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
