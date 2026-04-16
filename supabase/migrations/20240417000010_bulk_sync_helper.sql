-- Function to sync all active users to auth at once
CREATE OR REPLACE FUNCTION public.sync_all_users_to_auth()
RETURNS void AS $$
DECLARE
    u_record record;
BEGIN
    FOR u_record IN (SELECT id FROM public.users WHERE deleted_at IS NULL) LOOP
        PERFORM public.sync_user_to_auth(u_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
