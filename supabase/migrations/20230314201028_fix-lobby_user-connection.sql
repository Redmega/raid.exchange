alter table "public"."lobby_users" drop constraint "lobby_users_user_id_fkey";

alter table "public"."lobby_users" add constraint "lobby_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profile(user_id) not valid;

alter table "public"."lobby_users" validate constraint "lobby_users_user_id_fkey";
