create policy "Hosts can update the lobby"
on "public"."lobby"
as permissive
for update
to authenticated
using ((auth.uid() = host_id))
with check ((auth.uid() = host_id));

create policy "Hosts can delete their lobby"
on "public"."lobby"
as permissive
for delete
to authenticated
using ((auth.uid() = host_id));

create policy "Everyone can read lobby users"
on "public"."lobby_users"
as permissive
for select
to public
using (true);

create policy "Authed users can join a lobby"
on "public"."lobby_users"
as permissive
for insert
to authenticated
with check (true);

create policy "Hosts can delete anyone in their lobby"
on "public"."lobby_users"
as permissive
for delete
to authenticated
using ((auth.uid() = (SELECT lobby.host_id FROM lobby WHERE (lobby.id = lobby_users.lobby_id))));

create policy "Users can delete themselves"
on "public"."lobby_users"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));

create policy "Users can update themselves"
on "public"."lobby_users"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));
