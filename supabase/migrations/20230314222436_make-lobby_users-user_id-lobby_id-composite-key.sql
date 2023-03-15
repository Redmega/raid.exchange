alter table "public"."lobby_users" drop constraint "lobby_users_pkey";

drop index if exists "public"."lobby_users_pkey";

alter table "public"."lobby_users" drop column "id";

CREATE UNIQUE INDEX lobby_users_pkey ON public.lobby_users USING btree (lobby_id, user_id);

alter table "public"."lobby_users" add constraint "lobby_users_pkey" PRIMARY KEY using index "lobby_users_pkey";


