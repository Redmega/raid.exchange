alter table "public"."lobby" drop constraint "lobby_host_id_fkey";

alter table "public"."lobby" alter column "host_id" set not null;

alter table "public"."profile" drop column "id";

CREATE UNIQUE INDEX profile_pkey ON public.profile USING btree (user_id);

alter table "public"."profile" add constraint "profile_pkey" PRIMARY KEY using index "profile_pkey";

alter table "public"."lobby" add constraint "lobby_host_id_fkey" FOREIGN KEY (host_id) REFERENCES profile(user_id) not valid;

alter table "public"."lobby" validate constraint "lobby_host_id_fkey";

create policy "Enable read access for all users"
on "public"."lobby"
as permissive
for select
to public
using (true);

create policy "Enable read access for all users"
on "public"."profile"
as permissive
for select
to public
using (true);
