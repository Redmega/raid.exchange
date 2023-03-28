create policy "Users can update their own profiles"
on "public"."profile"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));
