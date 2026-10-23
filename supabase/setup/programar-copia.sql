-- Programa la copia automática de UN proyecto. Reemplaza <REF> por el identificador del proyecto de Supabase
-- (el texto antes de .supabase.co en la URL del proyecto) y ejecútalo en el SQL Editor, después de desplegar la función backup-b2.
select cron.schedule('copia-diaria-b2', '0 8 * * *', $cmd$
  select net.http_post(
    url := 'https://<REF>.supabase.co/functions/v1/backup-b2',
    headers := jsonb_build_object('Content-Type','application/json','x-backup-secret',(select decrypted_secret from vault.decrypted_secrets where name='backup_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$cmd$);   -- 08:00 UTC = 03:00 en Lima

select cron.schedule('limpiar-registro-copias', '30 8 * * *', $cmd$ delete from public.backup_runs where ran_at < now() - interval '90 days'; $cmd$);

-- Comprobar:  select jobname, schedule, active from cron.job;
