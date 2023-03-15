alter table "public"."lobby_users" add column "pokemon_name" text;

create policy "Enable read access for all users"
on "public"."lobby_users"
as permissive
for select
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."lobby_users"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable update for users on their own lobby row"
on "public"."lobby_users"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));