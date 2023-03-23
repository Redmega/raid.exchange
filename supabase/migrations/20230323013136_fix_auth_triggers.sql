alter table "public"."profile" alter column "avatar_url" drop not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into "public"."profile" (user_id, avatar_url, username)
  values (new.id,new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$
;
