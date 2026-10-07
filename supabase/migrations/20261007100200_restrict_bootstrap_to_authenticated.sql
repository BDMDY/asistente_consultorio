-- Supabase otorga EXECUTE a anon por defecto en funciones nuevas; el alta del primer administrador exige sesión.
revoke execute on function public.bootstrap_clinic(text, text, text, text, text, text) from anon;
