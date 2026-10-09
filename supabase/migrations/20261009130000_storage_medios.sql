-- Videos del hero: el bucket público clinic-media (ya con políticas de escritura solo para el administrador de la clínica,
-- en la carpeta <clinic_id>/) admite además video MP4/WebM de hasta 10 MB.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
where id = 'clinic-media';
