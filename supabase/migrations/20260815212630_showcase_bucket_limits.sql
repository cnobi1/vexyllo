-- Showcase uploads now go straight from the admin's browser to Storage
-- (bypassing the Next.js server action entirely — see src/lib/actions/
-- showcase.ts) because multi-file video batches were exceeding the server
-- action body size limit ("Unexpected end of form": the request body gets
-- truncated mid-upload once it exceeds bodySizeLimit, which the multipart
-- parser then reports as a malformed/truncated form rather than a clean
-- size-limit error). With uploads no longer passing through our server,
-- Supabase Storage itself becomes the enforcement point for file size and
-- type, not app code.
update storage.buckets
set file_size_limit = 47185920, -- 45MB, matches the existing video cap
    allowed_mime_types = array['image/*', 'video/*']
where id = 'showcase';
